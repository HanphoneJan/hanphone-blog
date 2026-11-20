package com.hanphone.blog.ui.admin

import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 评论管理：拉全量（后端最多 200 条）+ 本地搜索 + 删除 */
@HiltViewModel
class AdminCommentsViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<Comment>(paged = false) {

    val filtered: List<Comment>
        get() {
            val k = keyword.trim()
            if (k.isEmpty()) return items
            return items.filter {
                it.content.contains(k, ignoreCase = true) ||
                    it.nickname.contains(k, ignoreCase = true) ||
                    (it.blog?.title?.contains(k, ignoreCase = true) == true)
            }
        }

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Comment> =
        AdminPage(repo.comments().data.orEmpty())

    fun delete(comment: Comment) {
        viewModelScope.launch {
            val err = adminOp("删除失败") { repo.deleteComment(comment.id) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == comment.id }
        }
    }
}
