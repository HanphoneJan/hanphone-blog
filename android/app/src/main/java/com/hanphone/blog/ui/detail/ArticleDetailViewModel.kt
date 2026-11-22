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
import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 文章详情（正文 + 评论 + 点赞）。blogId 从导航 SavedStateHandle 读取 */
@HiltViewModel
class ArticleDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: BlogRepository
) : ViewModel(), PullRefreshHost {

    private val blogId: Long = checkNotNull(savedStateHandle["blogId"])

    var blog by mutableStateOf(MemoryCache.articleDetail(blogId))
        private set
    var comments by mutableStateOf<List<Comment>>(emptyList())
        private set
    /** 底部「相关推荐」（最多 3 条；为空时 UI 隐藏整个区块） */
    var related by mutableStateOf<List<Blog>>(emptyList())
        private set
    var loading by mutableStateOf(blog == null)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var liked by mutableStateOf(false)
        private set
    var likesCount by mutableIntStateOf(0)
        private set
    override var refreshing by mutableStateOf(false)
        private set

    /** 相关推荐请求；切换文章 / 连续刷新时取消上一次，避免把旧文章的推荐写进来 */
    private var relatedJob: Job? = null

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

    /** 下拉刷新：重拉正文 + 评论 + 相关推荐（loading 只控制首次骨架，这里用 refreshing 走顶部指示器） */
    override fun refresh() {
        if (refreshing) return
        viewModelScope.launch {
            refreshing = true
            loadInternal()
            refreshing = false
        }
    }

    private fun load() {
        viewModelScope.launch { loadInternal() }
    }

    private suspend fun loadInternal() {
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
            // 相关推荐走独立 Job：失败静默，不打断正文，也不影响正文的错误态
            loadRelated()
        } catch (e: Exception) {
            error = e.message ?: "网络错误"
        }
        loading = false
    }

    /**
     * 拉取「相关推荐」：优先随机三篇（每次不同），为空或失败时回退推荐位文章。
     * 过滤当前文章、未发布、空标题；两个接口都失败时保留旧值（刷新场景），否则以最新结果为准。
     * 推荐不写缓存：本来就该每次不同。
     */
    private fun loadRelated() {
        relatedJob?.cancel()
        relatedJob = viewModelScope.launch {
            val picked = fetchRelated()
            if (!isActive) return@launch
            if (picked != null) related = picked
        }
    }

    /** @return null = 两个接口都失败（调用方保留旧值） */
    private suspend fun fetchRelated(): List<Blog>? {
        var succeeded = false

        val random = requestRelated { repo.randomBlogs(blogId, RELATED_SIZE) }
        if (random != null && random.flag) succeeded = true
        val fromRandom = pickRelated(random?.data)
        if (fromRandom.isNotEmpty()) return fromRandom

        val recommend = requestRelated { repo.recommendBlogs() }
        if (recommend != null && recommend.flag) succeeded = true
        val fromRecommend = pickRelated(recommend?.data)
        if (fromRecommend.isNotEmpty()) return fromRecommend

        return if (succeeded) emptyList() else null
    }

    /** 网络异常当作「失败」返回 null；协程取消照常抛出（避免旧请求的后续步骤继续跑） */
    private suspend fun requestRelated(
        block: suspend () -> ApiResult<List<Blog>>
    ): ApiResult<List<Blog>>? = try {
        block()
    } catch (e: CancellationException) {
        throw e
    } catch (_: Exception) {
        null
    }

    private fun pickRelated(list: List<Blog>?): List<Blog> =
        list.orEmpty()
            .filter { it.id != blogId && it.published && it.title.isNotBlank() }
            .distinctBy { it.id }
            .take(RELATED_SIZE)

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

    private companion object {
        const val RELATED_SIZE = 3
    }
}
