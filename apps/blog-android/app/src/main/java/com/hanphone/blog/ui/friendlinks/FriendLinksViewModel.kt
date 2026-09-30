package com.hanphone.blog.ui.friendlinks

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 友链列表 */
@HiltViewModel
class FriendLinksViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel() {

    var links by mutableStateOf(MemoryCache.friendLinks ?: emptyList())
        private set
    var loading by mutableStateOf(MemoryCache.friendLinks == null)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        viewModelScope.launch {
            val cached = ContentStore.readFriendLinks()
            if (cached != null && links.isEmpty()) {
                links = cached
                loading = false
            }
        }
        // 首次加载友链列表
        refresh()
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            try {
                val res = repo.friendLinks()
                if (res.flag) {
                    links = res.data ?: emptyList()
                    MemoryCache.friendLinks = links
                    ContentStore.writeFriendLinks(links)
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
