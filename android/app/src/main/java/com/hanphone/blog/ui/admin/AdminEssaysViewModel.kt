package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.repo.AdminRepository
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
            val err = adminOp("操作失败") { repo.publishEssay(essay.id, essay.published != true) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == essay.id) it.copy(published = essay.published != true) else it }
            notify(if (essay.published == true) "已取消发布" else "已发布")
        }
    }

    fun toggleRecommend(essay: Essay) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.recommendEssay(essay.id, !essay.recommend) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == essay.id) it.copy(recommend = !essay.recommend) else it }
        }
    }

    fun delete(essay: Essay) {
        viewModelScope.launch {
            deletingId = essay.id
            val err = adminOp("删除失败") { repo.deleteEssay(essay.id) }
            if (err != null) {
                notify(err)
            } else {
                items = items.filterNot { it.id == essay.id }
                notify("已删除")
            }
            deletingId = null
        }
    }
}
