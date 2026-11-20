package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.AdminCollectRun
import com.hanphone.blog.data.model.AdminRebuildSummary
import com.hanphone.blog.data.model.AdminSummarySettings
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.data.repo.FileRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.util.MediaPicker
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.util.decoded
import com.hanphone.blog.util.normalized
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate
import javax.inject.Inject

/** 用户管理：改资料 / 管理员权限 / 重置密码 / 删除（对齐网页后台 /admin/users） */
@HiltViewModel
class AdminUsersViewModel @Inject constructor(
    private val repo: AdminRepository,
    @ApplicationContext private val appContext: Context,
    private val fileRepo: FileRepository
) : AdminListViewModel<User>(paged = false) {

    var busy by mutableStateOf(false)
        private set
    var uploading by mutableStateOf(false)
        private set

    /** 当前登录的管理员 id */
    val selfId: Long? get() = TokenStore.userId.value

    /**
     * 保护账号：内置 id=1 与自己。
     * 与网页后台一致——不允许降级/删除（否则会把自己或初始管理员锁在门外）。
     */
    fun isProtected(user: User): Boolean = user.id == 1L || user.id == selfId

    val filtered: List<User>
        get() {
            val k = keyword.trim()
            if (k.isEmpty()) return items
            return items.filter {
                (it.nickname ?: "").contains(k, ignoreCase = true) ||
                    (it.username ?: "").contains(k, ignoreCase = true) ||
                    (it.email ?: "").contains(k, ignoreCase = true)
            }
        }

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<User> =
        AdminPage(repo.users().data.orEmpty())

    /** 保存资料（昵称/邮箱/头像）；头像先由 [uploadAvatar] 换成外链 URL */
    fun saveProfile(user: User, nickname: String, email: String, avatar: String, done: () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("保存失败") {
                repo.saveUser(
                    mapOf(
                        "id" to user.id,
                        "nickname" to nickname.trim(),
                        "email" to email.trim(),
                        "avatar" to avatar.trim()
                    )
                )
            }
            if (err == null) {
                items = items.map {
                    if (it.id == user.id) {
                        it.copy(nickname = nickname.trim(), email = email.trim(), avatar = avatar.trim())
                    } else it
                }
                notify("已保存")
                done()
            } else {
                notify(err)
            }
            busy = false
        }
    }

    /** 设为 / 取消管理员（POST /admin/user 只带 id + type，后端忽略其余 null 字段） */
    fun setAdmin(user: User, admin: Boolean) {
        if (busy || isProtected(user)) return
        viewModelScope.launch {
            busy = true
            val type = if (admin) "1" else "0"
            val err = adminOp("操作失败") { repo.saveUser(mapOf("id" to user.id, "type" to type)) }
            if (err == null) {
                items = items.map { if (it.id == user.id) it.copy(type = type) else it }
                notify(if (admin) "已设为管理员" else "已取消管理员")
            } else {
                notify(err)
            }
            busy = false
        }
    }

    /** 重置密码：传 md5(明文)，后端 bcrypt 存储；成功后该用户全端下线 */
    fun resetPassword(user: User, newPassword: String, done: () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("重置失败") { repo.resetUserPassword(user.id, newPassword) }
            if (err == null) {
                notify("密码已重置")
                done()
            } else {
                notify(err)
            }
            busy = false
        }
    }

    fun delete(user: User) {
        if (busy || isProtected(user)) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("删除失败") { repo.deleteUser(user.id) }
            if (err == null) {
                items = items.filterNot { it.id == user.id }
                notify("已删除用户")
            } else {
                notify(err)
            }
            busy = false
        }
    }

    /** 从相册选头像 → 压缩 → 上传公共头像接口 → 回调外链 URL（失败传 null） */
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
                if (url == null) notify("头像上传失败")
                done(url)
            } catch (e: Exception) {
                notify("头像上传失败")
                done(null)
            } finally {
                MediaPicker.cleanup(temp)
                uploading = false
            }
        }
    }
}
