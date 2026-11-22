package com.hanphone.blog.ui.settings

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.core.AuthBridge
import com.hanphone.blog.core.clearAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.LoginSession
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 登录设备：列表 / 下拉刷新 / 下线 / 本机退出。
 *
 * 本机退出的清理逻辑放在 VM 里（照搬 SettingsViewModel.logout 的顺序），
 * 而不是页面回调：旋转重建也不会漏清 DataStore / 内存登录态 / 照片墙 WebView。
 */
@HiltViewModel
class SessionsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repo: BlogRepository
) : ViewModel(), PullRefreshHost {

    var items by mutableStateOf<List<LoginSession>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    override var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    /** 一次性提示（下线成功 / 失败原因），页面用 ToastMessage 消费 */
    var message by mutableStateOf<String?>(null)
        private set

    /** 正在下线的 sid：按钮据此禁用，避免连点 */
    var revoking by mutableStateOf<String?>(null)
        private set

    /** 本机已清理登录态，页面提示后返回「我的」 */
    var loggedOut by mutableStateOf(false)
        private set

    private val loggedIn: Boolean get() = TokenStore.token.value != null

    // 坑 4a：首载必须由 VM 自己发起，页面不再写 LaunchedEffect(Unit) { load() }
    init {
        if (loggedIn) load(fromPull = false)
    }

    /** 未登录时不发请求；已登录但列表空时补一次（如从登录页返回） */
    fun loadIfNeeded() {
        if (loggedIn && items.isEmpty() && !loading && error == null) load(fromPull = false)
    }

    fun retry() {
        if (loggedIn) load(fromPull = false)
    }

    override fun refresh() {
        if (!loggedIn) return
        load(fromPull = true)
    }

    fun consumeMessage() {
        message = null
    }

    fun consumeLoggedOut() {
        loggedOut = false
    }

    /**
     * 下线一台设备。
     *
     * 下线的若正是本机（服务端列表里的 current），必须立刻本地退出：
     * 服务端会话已吊销，继续留着本地 token 只会不断 401。
     */
    fun revoke(session: LoginSession) {
        if (revoking != null || session.sid.isBlank()) return
        val sid = session.sid
        viewModelScope.launch {
            revoking = sid
            val res = runCatching { repo.revokeSession(sid) }.getOrNull()
            revoking = null
            if (res?.flag == true) {
                if (session.current) {
                    logoutLocally()
                } else {
                    // 不从列表里删：留在原位标记「已失效」，用户能看到结果
                    items = items.map {
                        if (it.sid == sid) {
                            it.copy(revoked = true, active = false, revokedReason = "user_revoked")
                        } else it
                    }.let(::sorted)
                    message = "已下线"
                }
            } else {
                message = res?.message?.takeIf { it.isNotBlank() } ?: "下线失败，请稍后再试"
            }
        }
    }

    /** 本机已被吊销/过期时页面上的「退出登录」：会话已失效，无需再调服务端 */
    fun exitCurrentDevice() {
        if (loggedOut || revoking != null) return
        viewModelScope.launch { logoutLocally() }
    }

    /**
     * 本地退出清理（与 SettingsViewModel.logout 完全一致，仅省掉 /auth/logout：
     * 走到这里的会话已被吊销或已过期，再吊销一次没有意义）。
     */
    private suspend fun logoutLocally() {
        runCatching { context.clearAuth() }
        TokenStore.clear()
        // 第一方 WebView（照片墙）把登录态存在自己的 localStorage 里，不清会「假登录」
        AuthBridge.clearWebStorage()
        items = emptyList()
        loggedOut = true
    }

    private fun load(fromPull: Boolean) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            try {
                val res = repo.sessions()
                if (res.flag) {
                    items = sorted(res.data.orEmpty())
                    error = null
                } else {
                    error = res.message.ifBlank { "加载失败" }
                }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
            refreshing = false
        }
    }

    /** 本机在前 → 活跃在前 → 最近使用/登录时间倒序 */
    private fun sorted(list: List<LoginSession>): List<LoginSession> = list.sortedWith(
        compareByDescending<LoginSession> { it.current }
            .thenByDescending { it.active }
            .thenByDescending { it.lastUsedAt?.time ?: it.createdAt?.time ?: 0L }
            .thenByDescending { it.createdAt?.time ?: 0L }
    )
}
