package com.hanphone.blog.ui.message

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.repo.MessageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 留言板 */
@HiltViewModel
class MessageBoardViewModel @Inject constructor(
    private val repo: MessageRepository
) : ViewModel() {
    var items by mutableStateOf(MemoryCache.boardMessages ?: emptyList())
        private set
    var loading by mutableStateOf(MemoryCache.boardMessages == null)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        viewModelScope.launch {
            val cached = ContentStore.readBoardMessages()
            if (cached != null && items.isEmpty()) {
                items = cached
                loading = false
            }
        }
        // 首次加载留言列表
        refresh()
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch { load(fromPull) }
    }

    /** 写留言；结果经回调返回 */
    fun postMessage(nickname: String, content: String, onResult: (Message?) -> Unit) {
        viewModelScope.launch {
            val res = repo.postMessage(nickname, content)
            onResult(if (res.flag) res.data else null)
        }
    }

    private suspend fun load(fromPull: Boolean = false) {
        if (fromPull) refreshing = true else loading = true
        try {
            val res = repo.messages()
            if (res.flag) {
                items = res.data ?: emptyList()
                MemoryCache.boardMessages = items
                ContentStore.writeBoardMessages(items)
                error = null
            } else error = res.message.ifBlank { "加载失败" }
        } catch (e: Exception) {
            error = e.message ?: "网络错误"
        }
        loading = false
        refreshing = false
    }
}
