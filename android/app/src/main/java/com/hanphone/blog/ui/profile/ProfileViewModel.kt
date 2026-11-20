package com.hanphone.blog.ui.profile

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.core.auth
import com.hanphone.blog.core.saveAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.data.repo.FileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject

/**
 * 我的页：站点统计 + 累计访问量（缓存秒显 + 下拉刷新）+ 登录用户资料（展示/编辑）。
 */
@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val repo: BlogRepository,
    private val fileRepo: FileRepository
) : ViewModel() {

    var stats by mutableStateOf(MemoryCache.siteStats)
        private set
    var visits by mutableStateOf(MemoryCache.visitCount)
        private set
    var refreshing by mutableStateOf(false)
        private set

    /** 登录用户的完整资料（/user/current） */
    var profile by mutableStateOf<User?>(null)
        private set
    var profileLoading by mutableStateOf(false)
        private set

    init {
        // 冷启动：先读磁盘缓存展示，再静默刷新
        viewModelScope.launch {
            val s = ContentStore.readSiteStats()
            if (s != null && stats == null) stats = s
            val v = ContentStore.readVisitCount()
            if (v != null && visits == null) visits = v
        }
        // 首次加载统计数据
        refresh()
    }

    /** 退出登录：吊销服务端会话（失败无所谓，本地照样清） */
    suspend fun logout() {
        runCatching { repo.logout(TokenStore.refreshToken.value) }
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true
            // 下拉刷新必须连用户资料一起重拉：头像/昵称是服务端数据，只刷统计会一直显示登录时的旧头像
            if (fromPull) fetchProfile(TokenStore.userId.value)
            runCatching { repo.siteStats() }.onSuccess {
                if (it.flag && it.data != null) {
                    stats = it.data
                    MemoryCache.siteStats = it.data
                    ContentStore.writeSiteStats(it.data)
                }
            }
            runCatching { repo.visitCount() }.onSuccess {
                if (it.flag && it.data != null) {
                    visits = it.data
                    MemoryCache.visitCount = it.data
                    ContentStore.writeVisitCount(it.data)
                }
            }
            refreshing = false
        }
    }

    /** 拉取当前登录用户资料（登录态变化后由 UI 触发） */
    fun loadProfile(userId: Long?) {
        viewModelScope.launch { fetchProfile(userId) }
    }

    private suspend fun fetchProfile(userId: Long?) {
        if (userId == null) {
            profile = null
            return
        }
        profileLoading = true
        try {
            val res = repo.currentUser(userId)
            val data = res.data
            if (res.flag && data != null) {
                profile = data
                syncSession(data)
            }
        } catch (_: Exception) { }
        profileLoading = false
    }

    /**
     * 把服务端资料同步到内存登录态与 DataStore。
     *
     * 不同步的话，冷启动后「我的」页在请求返回前、以及其他读 TokenStore.avatar 的地方，
     * 会一直用登录当时缓存的旧头像——例如已换成本站地址的 Google 头像，本地还存着被墙的
     * googleusercontent 链接，看起来就是「刷新了还是旧头像」。
     */
    private suspend fun syncSession(data: User) {
        val token = TokenStore.token.value ?: return
        val nickname = data.nickname ?: TokenStore.nickname.value
        val avatar = data.avatar ?: TokenStore.avatar.value
        val type = data.type ?: TokenStore.userType.value
        TokenStore.restore(
            token,
            TokenStore.userId.value,
            nickname,
            avatar,
            type,
            TokenStore.refreshToken.value
        )
        runCatching {
            val current = appContext.auth.first()
            appContext.saveAuth(
                current.copy(nickname = nickname, avatar = avatar, userType = type)
            )
        }
    }

    /**
     * 上传头像（从相册选择的 uri 复制到缓存文件后上传），返回外链 url。
     * uri 需由 UI 层的 ActivityResult 提供。
     */
    suspend fun uploadAvatar(uri: android.net.Uri): String? = withContext(Dispatchers.IO) {
        runCatching {
            val tmp = File(appContext.cacheDir, "profile_avatar_${System.currentTimeMillis()}.jpg")
            appContext.contentResolver.openInputStream(uri)?.use { input ->
                tmp.outputStream().use { output -> input.copyTo(output) }
            } ?: return@runCatching null
            val res = fileRepo.uploadAvatar(tmp)
            tmp.delete()
            res.url
        }.getOrNull()
    }

    /**
     * 保存资料（昵称/头像）→ /user/current/update。
     * 成功后回调返回最新的 User（UI 负责刷新 TokenStore 展示态）。
     */
    fun saveProfile(userId: Long, nickname: String, avatar: String, onResult: (User?) -> Unit) {
        viewModelScope.launch {
            try {
                val user = mapOf(
                    "nickname" to nickname.trim(),
                    "avatar" to avatar
                )
                val res = repo.updateCurrentUser(userId, user)
                if (res.flag && res.data != null) {
                    profile = res.data
                    onResult(res.data)
                } else {
                    onResult(null)
                }
            } catch (_: Exception) {
                onResult(null)
            }
        }
    }

    /**
     * 保存账号资料（对齐网页 UserInfoForm）：昵称/头像/邮箱(+验证码)/密码(md5 摘要)。
     * 成败由 onResult(null) 反映，UI 负责提示并刷新登录态展示。
     */
    fun saveAccount(userId: Long, user: Map<String, String>, captcha: String?, onResult: (User?) -> Unit) {
        viewModelScope.launch {
            try {
                val res = repo.updateCurrentUserFull(userId, user, captcha)
                if (res.flag && res.data != null) {
                    profile = res.data
                    onResult(res.data)
                } else {
                    onResult(null)
                }
            } catch (_: Exception) {
                onResult(null)
            }
        }
    }

    /** 发送通用邮箱验证码（改邮箱场景，scene 默认 general），成功与否同步返回 */
    suspend fun sendGeneralCaptcha(email: String): Boolean =
        runCatching { repo.sendGeneralCaptcha(email).flag }.getOrDefault(false)
}
