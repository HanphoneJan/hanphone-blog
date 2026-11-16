package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 评论管理：拉全量（后端最多 200 条）+ 本地搜索 + 删除 */
@HiltViewModel
class AdminCommentsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var all by mutableStateOf<List<Comment>>(emptyList())
        private set
    var keyword by mutableStateOf("")
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    val filtered: List<Comment>
        get() {
            val k = keyword.trim()
            if (k.isEmpty()) return all
            return all.filter {
                it.content.contains(k, ignoreCase = true) ||
                    it.nickname.contains(k, ignoreCase = true) ||
                    (it.blog?.title?.contains(k, ignoreCase = true) == true)
            }
        }

    init {
        refresh()
    }

    fun search(value: String) {
        keyword = value
    }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                val res = repo.comments()
                all = res.data.orEmpty()
            } catch (e: Exception) {
                message = e.adminMessage("获取评论失败")
            } finally {
                loading = false
            }
        }
    }

    fun delete(comment: Comment) {
        viewModelScope.launch {
            try {
                val res = repo.deleteComment(comment.id)
                if (res.flag) {
                    all = all.filterNot { it.id == comment.id }
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
