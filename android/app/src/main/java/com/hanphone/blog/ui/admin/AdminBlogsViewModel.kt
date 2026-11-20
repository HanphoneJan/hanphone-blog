package com.hanphone.blog.ui.admin

import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.util.adminMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 博客列表管理：按标题搜索、发布/推荐切换、删除 */
@HiltViewModel
class AdminBlogsViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<Blog>(paged = true, remoteSearch = true) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Blog> {
        val res = repo.blogs(page, title = keyword)
        val data = res.data
        return AdminPage(
            items = data?.content.orEmpty(),
            page = page,
            totalPages = data?.totalPages ?: page
        )
    }

    fun togglePublished(blog: Blog) {
        viewModelScope.launch {
            runCatching { repo.toggleBlogPublished(blog) }
                .onSuccess { res ->
                    if (res.flag) {
                        items = items.map { if (it.id == blog.id) it.copy(published = !blog.published) else it }
                        notify(if (blog.published) "已取消发布（网页详情页需重新构建才会下线）" else "已发布（网页详情页需重新构建才会生效）")
                    } else {
                        notify(res.message.ifBlank { "操作失败" })
                    }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun toggleRecommend(blog: Blog) {
        viewModelScope.launch {
            runCatching { repo.toggleBlogRecommend(blog) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == blog.id) it.copy(recommend = !blog.recommend) else it }
                    else notify(res.message.ifBlank { "操作失败" })
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun delete(blog: Blog) {
        viewModelScope.launch {
            runCatching { repo.deleteBlog(blog.id) }
                .onSuccess { res ->
                    if (res.flag) {
                        items = items.filterNot { it.id == blog.id }
                        notify("已删除")
                    } else {
                        notify(res.message.ifBlank { "删除失败" })
                    }
                }
                .onFailure { message = it.adminMessage("删除失败") }
        }
    }
}
