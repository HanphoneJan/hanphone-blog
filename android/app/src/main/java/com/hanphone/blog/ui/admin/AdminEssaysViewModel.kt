package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.util.adminMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 随笔管理列表（含未发布）。
 *
 * 后端 `GET /admin/essays` 按 createTime 倒序、page 1 起始；分页/加载更多由
 * [AdminListViewModel] 统一处理。
 */
@HiltViewModel
class AdminEssaysViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<Essay>(paged = true) {

    var deletingId by mutableStateOf<Long?>(null)
        private set

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Essay> {
        val data = repo.essays(page).data
        return AdminPage(
            items = data?.content.orEmpty(),
            page = page,
            totalPages = data?.totalPages ?: page
        )
    }

    fun togglePublished(essay: Essay) {
        viewModelScope.launch {
            runCatching { repo.publishEssay(essay.id, essay.published != true) }
                .onSuccess { res ->
                    if (res.flag) {
                        items = items.map {
                            if (it.id == essay.id) it.copy(published = essay.published != true) else it
                        }
                        notify(if (essay.published == true) "已取消发布" else "已发布")
                    } else {
                        notify(res.message.ifBlank { "操作失败" })
                    }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun toggleRecommend(essay: Essay) {
        viewModelScope.launch {
            runCatching { repo.recommendEssay(essay.id, !essay.recommend) }
                .onSuccess { res ->
                    if (res.flag) {
                        items = items.map {
                            if (it.id == essay.id) it.copy(recommend = !essay.recommend) else it
                        }
                    } else {
                        notify(res.message.ifBlank { "操作失败" })
                    }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun delete(essay: Essay) {
        viewModelScope.launch {
            deletingId = essay.id
            runCatching { repo.deleteEssay(essay.id) }
                .onSuccess { res ->
                    if (res.flag) {
                        items = items.filterNot { it.id == essay.id }
                        notify("已删除")
                    } else {
                        notify(res.message.ifBlank { "删除失败" })
                    }
                }
                .onFailure { message = it.adminMessage("删除失败") }
            deletingId = null
        }
    }
}
