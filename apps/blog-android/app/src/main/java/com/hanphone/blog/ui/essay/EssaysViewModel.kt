package com.hanphone.blog.ui.essay

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingSource
import androidx.paging.PagingState
import androidx.paging.cachedIn
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayComment
import com.hanphone.blog.data.repo.EssayRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 随笔动态流（朋友圈列表）—— Paging 3 分页。
 *
 * 服务端 /essays?page=N&pageSize=10 返回 Spring 风格 PageResult（number 0 起始）。
 * PagingSource 的 key 为 1 起始页码，nextKey 按「已取页数+1」推进，取到末页或空页即止。
 *
 * 冷启动体验：Paging 首屏（网络）返回前，先用缓存秒显内容（MemoryCache → ContentStore），
 * 避免进入页面就闪骨架屏/转圈；paging 数据到达后无缝替换（key 一致不闪）。
 */
@HiltViewModel
class EssayListViewModel @Inject constructor(
    private val repo: EssayRepository
) : ViewModel() {

    val pagerFlow = Pager(
        config = PagingConfig(
            pageSize = 10,
            initialLoadSize = 10,
            prefetchDistance = 3,
            enablePlaceholders = false
        ),
        initialKey = 1
    ) {
        EssayPagingSource(repo)
    }.flow.cachedIn(viewModelScope)

    /** 冷启动秒显缓存（Paging 首屏未到时先渲染它） */
    var coldFeed by mutableStateOf<List<Essay>?>(MemoryCache.essayMoments?.takeIf { it.isNotEmpty() })
        private set

    init {
        // 进程内无缓存时读磁盘，拿到后交给 UI 立即渲染；Paging 随后网络回源覆盖
        viewModelScope.launch {
            if (coldFeed.isNullOrEmpty()) {
                val cached = ContentStore.readEssayFirstPage()
                if (!cached.isNullOrEmpty()) {
                    coldFeed = cached
                    MemoryCache.essayMoments = cached
                }
            }
        }
    }

    /** 列表条目内加载某条随笔的评论（内存缓存：同一 VM 生命周期内不再重复请求） */
    private val commentsCache = mutableMapOf<Long, List<EssayComment>?>()

    /** 各随笔评论（页面级状态：列表行与底部输入条共享，提交后即时更新） */
    val essayComments = mutableStateMapOf<Long, List<EssayComment>>()

    fun loadComments(essayId: Long, onResult: (List<EssayComment>?) -> Unit = {}) {
        commentsCache[essayId]?.let { onResult(it); if (it != null) essayComments[essayId] = it; return }
        viewModelScope.launch {
            try {
                val res = repo.comments(essayId)
                val list = if (res.flag) res.data ?: emptyList() else null
                commentsCache[essayId] = list
                if (list != null) essayComments[essayId] = list
                onResult(list)
            } catch (_: Exception) {
                commentsCache[essayId] = null
                onResult(null)
            }
        }
    }

    /** 评论提交成功后本地追加（即时回显，无需重拉） */
    fun addEssayComment(essayId: Long, c: EssayComment) {
        essayComments[essayId] = (essayComments[essayId] ?: emptyList()) + c
    }

    /** 列表条目内点赞 */
    fun likeEssay(essayId: Long, uid: Long, wantLike: Boolean, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val res = repo.likeEssay(essayId, uid, wantLike)
            onResult(res.flag)
        }
    }

    /** 列表条目内发评论 */
    fun postEssayComment(essayId: Long, uid: Long, content: String, parentCommentId: Long, onResult: (EssayComment?) -> Unit) {
        viewModelScope.launch {
            val res = repo.postEssayComment(essayId, uid, content, parentCommentId)
            onResult(if (res.flag) res.data else null)
        }
    }
}

/** 分页数据源：key = 1 起始页码 */
class EssayPagingSource(
    private val repo: EssayRepository
) : PagingSource<Int, Essay>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Essay> {
        val page = params.key ?: 1
        return try {
            val res = repo.essays(page, 10)
            if (res.flag && res.data != null) {
                val d = res.data
                val content = d.content
                // 第一页成功即写三层缓存，供下次进入秒显（旧缓存被新数据覆盖）
                if (page == 1 && content.isNotEmpty()) {
                    MemoryCache.essayMoments = content
                    ContentStore.writeEssayFirstPage(content)
                }
                val next = if (content.isNotEmpty() && page < d.totalPages) page + 1 else null
                LoadResult.Page(data = content, prevKey = if (page == 1) null else page - 1, nextKey = next)
            } else {
                LoadResult.Error(IllegalStateException(res.message.ifBlank { "加载失败" }))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Essay>): Int? {
        val anchor = state.anchorPosition ?: return null
        return state.closestPageToPosition(anchor)?.prevKey?.plus(1)
            ?: state.closestPageToPosition(anchor)?.nextKey?.minus(1)
    }
}

/** 随笔详情（正文 + 评论 + 点赞）。essayId 从导航 SavedStateHandle 读取 */
@HiltViewModel
class EssayDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: EssayRepository
) : ViewModel() {

    private val essayId: Long = checkNotNull(savedStateHandle["essayId"])

    var essay by mutableStateOf(MemoryCache.essayDetail(essayId))
        private set
    var comments by mutableStateOf<List<EssayComment>>(emptyList())
        private set
    var loading by mutableStateOf(essay == null)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var liked by mutableStateOf(false)
        private set
    var likesCount by mutableIntStateOf(0)
        private set

    init { load() }

    fun load() {
        viewModelScope.launch {
            error = null
            try {
                val e = repo.essay(essayId)
                if (e.flag && e.data != null) {
                    essay = e.data
                    liked = e.data.liked
                    likesCount = e.data.likes
                    MemoryCache.putEssayDetail(essayId, e.data)
                } else error = e.message.ifBlank { "加载失败" }
                val c = repo.comments(essayId)
                if (c.flag) comments = c.data ?: emptyList()
            } catch (ex: Exception) {
                error = ex.message ?: "网络错误"
            }
            loading = false
        }
    }

    fun toggleLike(uid: Long) {
        viewModelScope.launch {
            val wantLike = !liked
            val res = repo.likeEssay(essayId, uid, wantLike)
            if (res.flag) {
                liked = wantLike
                likesCount += if (wantLike) 1 else -1
            }
        }
    }

    fun addComment(c: EssayComment) {
        comments = comments + c
    }
}
