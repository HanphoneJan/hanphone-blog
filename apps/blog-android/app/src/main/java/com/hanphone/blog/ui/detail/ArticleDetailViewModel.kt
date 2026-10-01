package com.hanphone.blog.ui.detail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 文章详情（正文 + 评论 + 点赞）。blogId 从导航 SavedStateHandle 读取 */
@HiltViewModel
class ArticleDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: BlogRepository
) : ViewModel() {

    private val blogId: Long = checkNotNull(savedStateHandle["blogId"])

    var blog by mutableStateOf(MemoryCache.articleDetail(blogId))
        private set
    var comments by mutableStateOf<List<Comment>>(emptyList())
        private set
    var loading by mutableStateOf(blog == null)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var liked by mutableStateOf(false)
        private set
    var likesCount by mutableIntStateOf(0)
        private set

    init {
        // 冷启动秒显：磁盘详情/评论（网络已到则不覆盖网络结果）
        viewModelScope.launch {
            if (blog == null) {
                val cached = ContentStore.readArticleDetail(blogId)
                if (blog == null && cached != null) {
                    blog = cached
                    MemoryCache.putArticleDetail(blogId, cached)
                    loading = false
                }
            }
            if (comments.isEmpty()) {
                val cachedComments = ContentStore.readArticleComments(blogId)
                if (comments.isEmpty() && cachedComments != null) comments = cachedComments
            }
        }
        load()
    }

    fun retry() { load() }

    private fun load() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val b = repo.blog(blogId)
                if (b.flag && b.data != null) {
                    blog = b.data
                    liked = b.data.liked
                    likesCount = b.data.likes
                    MemoryCache.putArticleDetail(blogId, b.data)
                    ContentStore.writeArticleDetail(blogId, b.data)
                } else error = b.message.ifBlank { "加载失败" }
                val c = repo.comments(blogId)
                if (c.flag) {
                    comments = c.data ?: emptyList()
                    ContentStore.writeArticleComments(blogId, c.data ?: emptyList())
                }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
        }
    }

    fun toggleLike(uid: Long) {
        viewModelScope.launch {
            val wantLike = !liked
            val res = repo.likeBlog(blogId, uid, wantLike)
            if (res.flag) {
                liked = wantLike
                likesCount += if (wantLike) 1 else -1
            }
        }
    }

    fun addComment(c: Comment) {
        comments = comments + c
    }

    /** 登录用户发表评论/回复（对齐网页版：登录后评论，按 uid 取本人资料；parentId 为回复目标，-1 为顶级）；结果经回调返回 */
    fun postCommentAsUser(content: String, userId: Long, parentId: Long = -1L, onResult: (Comment?) -> Unit) {
        viewModelScope.launch {
            val res = repo.postCommentAsUser(blogId, userId, content, parentId)
            onResult(if (res.flag) res.data else null)
        }
    }
}
