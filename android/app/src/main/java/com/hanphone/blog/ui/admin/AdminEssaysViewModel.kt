package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 随笔管理列表（含未发布）。
 *
 * 后端 `GET /admin/essays` 按 createTime 倒序、page 1 起始；
 * 这里做增量加载（每页 10 条）。
 */
@HiltViewModel
class AdminEssaysViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var items by mutableStateOf<List<Essay>>(emptyList())
        private set
    var page by mutableStateOf(1)
        private set
    var loading by mutableStateOf(true)
        private set
    var loadingMore by mutableStateOf(false)
        private set
    var hasMore by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    var deletingId by mutableStateOf<Long?>(null)
        private set

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                val res = repo.essays(1)
                items = res.data?.content.orEmpty()
                page = 1
                hasMore = (res.data?.totalPages ?: 0) > 1
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun loadMore() {
        if (loading || loadingMore || !hasMore) return
        viewModelScope.launch {
            loadingMore = true
            try {
                val next = page + 1
                val res = repo.essays(next)
                val content = res.data?.content.orEmpty()
                if (content.isEmpty()) {
                    hasMore = false
                } else {
                    items = items + content
                    page = next
                    hasMore = next < (res.data?.totalPages ?: next)
                }
            } catch (e: Exception) {
                message = e.adminMessage("加载更多失败")
            } finally {
                loadingMore = false
            }
        }
    }

    fun togglePublished(essay: Essay) {
        viewModelScope.launch {
            try {
                val res = repo.publishEssay(essay.id, essay.published != true)
                if (res.flag) {
                    items = items.map { if (it.id == essay.id) it.copy(published = essay.published == true != true) else it }
                    message = if (essay.published == true) "已取消发布" else "已发布"
                } else {
                    message = res.message.ifBlank { "操作失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("操作失败")
            }
        }
    }

    fun toggleRecommend(essay: Essay) {
        viewModelScope.launch {
            try {
                val res = repo.recommendEssay(essay.id, !essay.recommend)
                if (res.flag) {
                    items = items.map { if (it.id == essay.id) it.copy(recommend = !essay.recommend) else it }
                } else {
                    message = res.message.ifBlank { "操作失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("操作失败")
            }
        }
    }

    fun delete(essay: Essay) {
        viewModelScope.launch {
            deletingId = essay.id
            try {
                val res = repo.deleteEssay(essay.id)
                if (res.flag) {
                    items = items.filterNot { it.id == essay.id }
                    message = "已删除"
                } else {
                    message = res.message.ifBlank { "删除失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("删除失败")
            } finally {
                deletingId = null
            }
        }
    }

    fun consumeMessage() {
        message = null
    }
}
