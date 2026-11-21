package com.hanphone.blog.ui.bookmark

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.BookmarkStore
import com.hanphone.blog.data.model.BookmarkItem
import com.hanphone.blog.data.repo.BookmarkRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 我的收藏：一次拉全部类型（/bookmarks 无 type），Tab 切换在前端过滤。
 *
 * 取消收藏走 [BookmarkStore]（乐观更新 + 失败回滚），页面再按
 * [BookmarkStore.keys] 过滤，已取消的条目立即消失，无需重新请求列表。
 */
@HiltViewModel
class BookmarksViewModel @Inject constructor(
    private val repo: BookmarkRepository
) : ViewModel(), PullRefreshHost {

    /** 列表本身是「已收藏」的全集；实际展示还要和 BookmarkStore.keys 求交 */
    var items by mutableStateOf<List<BookmarkItem>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    override var refreshing by mutableStateOf(false)
        private set

    /** 当前 Tab：BookmarkStore.BLOG / ESSAY / DOC */
    var tab by mutableStateOf(BookmarkStore.BLOG)
        private set

    private val loggedIn: Boolean get() = TokenStore.userId.value != null

    init {
        if (loggedIn) load(fromPull = false)
    }

    fun loadIfNeeded() {
        if (loggedIn && items.isEmpty() && !loading && error == null) load(fromPull = false)
    }

    override fun refresh() {
        if (!loggedIn) return
        load(fromPull = true)
    }

    fun selectTab(type: String) {
        tab = type
    }

    /** 取消收藏：返回 false/null 时由页面提示（null = 请求失败并已回滚） */
    suspend fun cancel(item: BookmarkItem): Boolean? =
        BookmarkStore.toggle(item.type, item.key)

    private fun load(fromPull: Boolean) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            try {
                // 先同步收藏状态：列表要按 BookmarkStore.keys 过滤（取消后立即消失），
                // keys 还是空的时候会让「有数据却显示空态」。
                BookmarkStore.refresh()
                val res = repo.list()
                if (res.flag && res.data != null) {
                    items = res.data
                    error = null
                } else error = res.message.ifBlank { "加载失败" }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
            refreshing = false
        }
    }
}
