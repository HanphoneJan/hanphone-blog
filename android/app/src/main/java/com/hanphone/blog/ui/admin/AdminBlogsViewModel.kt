package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 博客列表管理：按标题搜索、发布/推荐切换、删除 */
@HiltViewModel
class AdminBlogsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var items by mutableStateOf<List<Blog>>(emptyList())
        private set
    var keyword by mutableStateOf("")
        private set
    var page by mutableStateOf(1)
        private set
    var totalPages by mutableStateOf(1)
        private set
    var loading by mutableStateOf(true)
        private set
    var loadingMore by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    private var searchJob: Job? = null

    init {
        load(reset = true)
    }

    /** 输入即搜 + 350ms 防抖（与首页搜索一致，避免每敲一个字打一次后台） */
    fun search(value: String) {
        keyword = value
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            load(reset = true)
        }
    }

    fun refresh() = load(reset = true)

    fun loadMore() {
        if (loading || loadingMore || page >= totalPages) return
        load(reset = false)
    }

    private fun load(reset: Boolean) {
        viewModelScope.launch {
            if (reset) loading = true else loadingMore = true
            try {
                val target = if (reset) 1 else page + 1
                val res = repo.blogs(target, title = keyword.trim())
                val content = res.data?.content.orEmpty()
                items = if (reset) content else items + content
                page = target
                totalPages = res.data?.totalPages ?: target
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
                loadingMore = false
            }
        }
    }

    fun togglePublished(blog: Blog) {
        viewModelScope.launch {
            try {
                val res = repo.toggleBlogPublished(blog)
                if (res.flag) {
                    items = items.map { if (it.id == blog.id) it.copy(published = !blog.published) else it }
                    message = if (blog.published) "已取消发布（网页详情页需重新构建才会下线）" else "已发布（网页详情页需重新构建才会生效）"
                } else {
                    message = res.message.ifBlank { "操作失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("操作失败")
            }
        }
    }

    fun toggleRecommend(blog: Blog) {
        viewModelScope.launch {
            try {
                val res = repo.toggleBlogRecommend(blog)
                if (res.flag) {
                    items = items.map { if (it.id == blog.id) it.copy(recommend = !blog.recommend) else it }
                } else {
                    message = res.message.ifBlank { "操作失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("操作失败")
            }
        }
    }

    fun delete(blog: Blog) {
        viewModelScope.launch {
            try {
                val res = repo.deleteBlog(blog.id)
                if (res.flag) {
                    items = items.filterNot { it.id == blog.id }
                    message = "已删除"
                } else {
                    message = res.message.ifBlank { "删除失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("删除失败")
            }
        }
    }

    fun consumeMessage() {
        message = null
    }
}
