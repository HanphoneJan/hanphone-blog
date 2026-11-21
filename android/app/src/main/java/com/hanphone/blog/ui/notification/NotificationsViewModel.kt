package com.hanphone.blog.ui.notification

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.NotificationBadge
import com.hanphone.blog.data.model.NotificationVO
import com.hanphone.blog.data.repo.NotificationRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 站内通知列表：page 1 起始分页（滚动到底加载更多）+ 未读数维护。
 *
 * 未读数写进 [NotificationBadge]：通知页读/全部已读后，「我的 → 通知」入口立即同步，
 * 不必等下次下拉刷新。
 */
@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repo: NotificationRepository
) : ViewModel(), PullRefreshHost {

    var items by mutableStateOf<List<NotificationVO>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var loadingMore by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var unread by mutableStateOf(0L)
        private set
    var hasMore by mutableStateOf(false)
        private set

    override var refreshing by mutableStateOf(false)
        private set

    private var page = 1
    private val pageSize = 20

    private val loggedIn: Boolean get() = TokenStore.userId.value != null

    init {
        // VM 规则：init 自己发起首载（别指望页面 LaunchedEffect，容易在重构时丢）
        if (loggedIn) load(reset = true, fromPull = false)
    }

    /** 页面重新可见/登录后回来后补一次首载（已加载过则不打扰） */
    fun loadIfNeeded() {
        if (loggedIn && items.isEmpty() && !loading && error == null) {
            load(reset = true, fromPull = false)
        }
    }

    override fun refresh() {
        if (!loggedIn) return
        load(reset = true, fromPull = true)
    }

    fun loadMore() {
        if (!loggedIn || !hasMore || loading || loadingMore) return
        load(reset = false, fromPull = false)
    }

    /** 点条目：本地先置已读（立即消失红点），网络失败也不回滚——用户已经看过内容 */
    fun markRead(n: NotificationVO) {
        if (n.read) return
        items = items.map { if (it.id == n.id) it.copy(read = true) else it }
        unread = (unread - 1).coerceAtLeast(0)
        NotificationBadge.set(unread)
        viewModelScope.launch { runCatching { repo.markRead(n.id) } }
    }

    fun markAllRead() {
        if (items.none { !it.read } && unread == 0L) return
        items = items.map { it.copy(read = true) }
        unread = 0
        NotificationBadge.set(0)
        viewModelScope.launch { runCatching { repo.markAllRead() } }
    }

    private fun load(reset: Boolean, fromPull: Boolean) {
        viewModelScope.launch {
            if (reset) {
                if (fromPull) refreshing = true else loading = true
            } else {
                loadingMore = true
            }
            val nextPage = if (reset) 1 else page + 1
            try {
                val res = repo.page(nextPage, pageSize)
                val data = res.data
                if (res.flag && data != null) {
                    val fetched = data.items
                    items = if (reset) fetched else (items + fetched).distinctBy { it.id }
                    page = nextPage
                    hasMore = items.size < data.total
                    unread = data.unread
                    NotificationBadge.set(unread)
                    error = null
                } else if (reset) {
                    error = res.message.ifBlank { "加载失败" }
                }
            } catch (e: Exception) {
                if (reset) error = e.message ?: "网络错误"
            }
            loading = false
            loadingMore = false
            refreshing = false
        }
    }
}
