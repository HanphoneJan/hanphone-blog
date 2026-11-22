package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.core.AuthBridge
import com.hanphone.blog.core.clearAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.McpKeyCreated
import com.hanphone.blog.data.model.McpKeySummary
import com.hanphone.blog.data.model.PersonInfo
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.data.repo.FileRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.util.MediaPicker
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

/** 个人中心的六个板块（对齐网页 /admin/personal 的 Tab） */
enum class PersonalTab(val label: String, val category: String?) {
    INFO("信息", null),
    SKILL("技能", "skill"),
    HOBBY("爱好", "hobby"),
    WORK("作品", "work"),
    EVAL("评价", "evaluation"),
    KEYS("密钥", "")
}

/**
 * 后台个人中心（原生）。
 *
 * 页面本质是「关于页」的 CMS：基本信息 + 技能/爱好/作品/评价四类条目（同一张
 * `personal_info` 表按 category 区分）+ MCP 密钥。数据量很小，一次拉全、客户端分组即可，
 * 不做分页（与网页一致）。
 */
@HiltViewModel
class AdminPersonalViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val repo: AdminRepository,
    private val blogRepo: BlogRepository,
    private val fileRepo: FileRepository
) : ViewModel(), PullRefreshHost {

    var tab by mutableStateOf(PersonalTab.INFO)
        private set

    var user by mutableStateOf<User?>(null)
        private set
    var nickname by mutableStateOf("")
        private set
    var email by mutableStateOf("")
        private set
    var avatar by mutableStateOf("")
        private set

    var loading by mutableStateOf(true)
        private set
    override var refreshing by mutableStateOf(false)
        private set
    var busy by mutableStateOf(false)
        private set
    var uploading by mutableStateOf(false)
        private set

    /** 技能/爱好/作品条目的配图上传中（与头像上传互不影响） */
    var uploadingPic by mutableStateOf(false)
        private set

    var message by mutableStateOf<String?>(null)
        private set
    var items by mutableStateOf<List<PersonInfo>>(emptyList())
        private set
    var keys by mutableStateOf<List<McpKeySummary>>(emptyList())
        private set

    /** 创建/轮转后一次性展示的完整密钥（列表接口永远拿不到明文） */
    var revealed by mutableStateOf<McpKeyCreated?>(null)
        private set

    /** 改密码会让服务端吊销全部会话，页面据此回到「我的」未登录态 */
    var loggedOut by mutableStateOf(false)
        private set

    private val userId: Long? get() = TokenStore.userId.value

    init {
        load()
    }

    fun chooseTab(t: PersonalTab) {
        tab = t
    }

    fun onNickname(value: String) { nickname = value }
    fun onEmail(value: String) { email = value }
    fun onAvatar(value: String) { avatar = value }

    fun consumeMessage() { message = null }
    fun consumeRevealed() { revealed = null }
    fun consumeLoggedOut() { loggedOut = false }

    override fun refresh() = load(fromPull = true)

    fun load(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            val id = userId
            if (id == null) {
                message = "登录状态无效，请重新登录"
                loading = false
                refreshing = false
                return@launch
            }
            // 基本信息（昵称/邮箱/头像/类型）
            runCatching { blogRepo.currentUser(id) }.getOrNull()?.let { res ->
                val data = res.data
                if (res.flag && data != null) {
                    user = data
                    nickname = data.nickname.orEmpty()
                    email = data.email.orEmpty()
                    avatar = data.avatar.orEmpty()
                    // 同步到全局登录态：其他页面与 WebView 注入随即用上新值
                    TokenStore.updateProfile(data.nickname, data.avatar, data.type, data.email)
                } else if (user == null) {
                    message = res.message.ifBlank { "资料加载失败" }
                }
            }
            // 关于页展示条目
            runCatching { repo.personInfos() }.getOrNull()?.let { res ->
                if (res.flag) items = res.data.orEmpty()
            }
            // MCP 密钥
            runCatching { repo.mcpKeys() }.getOrNull()?.let { res ->
                if (res.flag) keys = res.data.orEmpty()
            }
            loading = false
            refreshing = false
        }
    }

    /** 当前板块的条目：rank 升序，同 rank 按 id（与网页 useSkills 等一致） */
    fun itemsFor(tab: PersonalTab): List<PersonInfo> {
        val category = tab.category ?: return emptyList()
        return items.filter { it.category == category }
            .sortedWith(compareBy({ it.rank ?: 0L }, { it.id ?: 0L }))
    }

    fun uploadAvatar(uri: Uri, done: (String?) -> Unit) {
        if (uploading) return
        viewModelScope.launch {
            uploading = true
            var temp: File? = null
            try {
                val media = MediaPicker.prepare(appContext, uri)
                temp = media.file
                val res = runCatching { fileRepo.uploadAvatar(media.file) }.getOrNull()
                val url = res?.url?.takeIf { it.isNotBlank() }
                if (url == null) message = "头像上传失败"
                done(url)
            } catch (e: Exception) {
                message = "头像上传失败"
                done(null)
            } finally {
                MediaPicker.cleanup(temp)
                uploading = false
            }
        }
    }

    /** 条目配图（作品封面 / 爱好配图）：相册选图 → 上传，成功后回填 URL */
    fun uploadPersonImage(uri: Uri, onDone: (String?) -> Unit) {
        if (uploadingPic) return
        viewModelScope.launch {
            uploadingPic = true
            try {
                val url = repo.uploadImage(appContext, uri, "blog/personal")
                if (url == null) message = "配图上传失败"
                onDone(url)
            } finally {
                uploadingPic = false
            }
        }
    }

    fun saveProfile(done: () -> Unit) {
        val id = userId ?: return
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("保存失败") {
                repo.saveUser(
                    mapOf(
                        "id" to id,
                        "nickname" to nickname.trim(),
                        "email" to email.trim(),
                        "avatar" to avatar.trim()
                    )
                )
            }
            if (err == null) {
                // 头像走 /admin/setAvatar 更贴合网页（个人中心的上传就是为了换头像）
                if (avatar.isNotBlank() && avatar != user?.avatar) {
                    runCatching { repo.setAvatar(id, avatar.trim()) }.getOrNull()?.let { res ->
                        if (res.flag && res.data != null) user = res.data
                    }
                }
                TokenStore.updateProfile(nickname.trim(), avatar.trim(), user?.type, email.trim())
                user = user?.copy(
                    nickname = nickname.trim(),
                    email = email.trim(),
                    avatar = avatar.trim()
                ) ?: user
                message = "已保存"
                done()
            } else {
                message = err
            }
            busy = false
        }
    }

    /**
     * 管理员重置自己的密码：服务端会吊销全部会话（含当前设备），
     * 所以成功后必须本地退出，否则后续请求全是 401。
     */
    fun changePassword(newPassword: String, done: () -> Unit) {
        val id = userId ?: return
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("密码修改失败") { repo.resetUserPassword(id, newPassword) }
            if (err == null) {
                done()
                appContext.clearAuth()
                TokenStore.clear()
                AuthBridge.clearWebStorage()
                loggedOut = true
            } else {
                message = err
            }
            busy = false
        }
    }

    fun saveItem(item: PersonInfo, done: () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("保存失败") { repo.savePersonInfo(item) }
            if (err == null) {
                message = if (item.id == null) "已添加" else "已保存"
                done()
                load(fromPull = true)
            } else {
                message = err
            }
            busy = false
        }
    }

    fun deleteItem(item: PersonInfo) {
        val id = item.id ?: return
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("删除失败") { repo.deletePersonInfo(id) }
            if (err == null) {
                items = items.filterNot { it.id == id }
                message = "已删除"
            } else {
                message = err
            }
            busy = false
        }
    }

    fun createKey(name: String, done: () -> Unit) {
        if (busy) return
        if (name.isBlank()) { message = "请填写密钥名称"; return }
        viewModelScope.launch {
            busy = true
            val res = runCatching { repo.createMcpKey(name.trim()) }.getOrNull()
            if (res?.flag == true && res.data != null) {
                revealed = res.data
                done()
                loadKeys()
            } else {
                message = res?.message?.ifBlank { "创建失败" } ?: "创建失败"
            }
            busy = false
        }
    }

    fun regenerateKey(key: McpKeySummary, done: () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val res = runCatching { repo.regenerateMcpKey(key.id) }.getOrNull()
            if (res?.flag == true && res.data != null) {
                revealed = res.data
                done()
                loadKeys()
            } else {
                message = res?.message?.ifBlank { "轮转失败" } ?: "轮转失败"
            }
            busy = false
        }
    }

    fun toggleKey(key: McpKeySummary) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("操作失败") { repo.toggleMcpKey(key.id, !key.active) }
            if (err == null) {
                keys = keys.map { if (it.id == key.id) it.copy(active = !key.active) else it }
            } else {
                message = err
            }
            busy = false
        }
    }

    fun deleteKey(key: McpKeySummary) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("删除失败") { repo.deleteMcpKey(key.id) }
            if (err == null) {
                keys = keys.filterNot { it.id == key.id }
                message = "已删除"
            } else {
                message = err
            }
            busy = false
        }
    }

    private suspend fun loadKeys() {
        runCatching { repo.mcpKeys() }.getOrNull()?.let { if (it.flag) keys = it.data.orEmpty() }
    }
}
