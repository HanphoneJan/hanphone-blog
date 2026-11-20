package com.hanphone.blog.ui.message

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.data.repo.MessageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.hanphone.blog.data.cache.CachedList

/** 留言板 */
@HiltViewModel
class MessageBoardViewModel @Inject constructor(
    private val repo: MessageRepository
) : ViewModel(), PullRefreshHost {
    var items by mutableStateOf(MemoryCache.boardMessages ?: emptyList())
        private set
    var loading by mutableStateOf(MemoryCache.boardMessages == null)
        private set
    override var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    private val cache = CachedList(
        memory = { MemoryCache.boardMessages },
        writeMemory = { MemoryCache.boardMessages = it },
        readDisk = { ContentStore.readBoardMessages() },
        writeDisk = { ContentStore.writeBoardMessages(it) }
    )

    init {
        viewModelScope.launch {
            cache.seed()?.let { if (items.isEmpty()) { items = it; loading = false } }
        }
        // 首次加载留言列表
        refresh()
    }

    override fun refresh() {
        refresh(fromPull = true)
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch { load(fromPull) }
    }

    /** 写留言/回复留言（对齐网页版：作者取登录身份，未登录固定"匿名用户"，无昵称输入）；结果经回调返回 */
    fun postMessage(nickname: String, content: String, avatar: String = "", parentId: Long = -1L, onResult: (Message?) -> Unit) {
        viewModelScope.launch {
            val res = repo.postMessage(nickname, content, avatar, parentId)
            onResult(if (res.flag) res.data else null)
        }
    }

    /** 发送成功本地即时回显（对齐 web ADD_MESSAGE；避免全量重拉，下次进页/下拉刷新取权威列表） */
    fun addMessageLocal(m: Message) {
        items = listOf(m) + items
        MemoryCache.boardMessages = items
    }

    private suspend fun load(fromPull: Boolean = false) {
        if (fromPull) refreshing = true else loading = true
        try {
            val res = repo.messages()
            if (res.flag) {
                items = res.data ?: emptyList()
                cache.store(items)
                error = null
            } else error = res.message.ifBlank { "加载失败" }
        } catch (e: Exception) {
            error = e.message ?: "网络错误"
        }
        loading = false
        refreshing = false
    }
}
