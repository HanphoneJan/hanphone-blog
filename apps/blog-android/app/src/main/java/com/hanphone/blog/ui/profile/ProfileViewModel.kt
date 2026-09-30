package com.hanphone.blog.ui.profile

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.data.repo.FileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
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

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true
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
        if (userId == null) {
            profile = null
            return
        }
        viewModelScope.launch {
            profileLoading = true
            try {
                val res = repo.currentUser(userId)
                if (res.flag) profile = res.data
            } catch (_: Exception) { }
            profileLoading = false
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
}
