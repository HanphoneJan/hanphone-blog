package com.hanphone.blog.ui.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 全局搜索（对齐 web /search：输入即搜 + 防抖 350ms + 类型筛选；结果内存缓存 5 分钟）。
 *
 * 类型筛选由**服务端**过滤（`type=BLOG/ESSAY/PROJECT/DOC`，null = 全部），缓存键带类型，
 * 否则「全部」的结果会被当成「博客」的结果直接返回。
 */
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel(), PullRefreshHost {

    var query by mutableStateOf("")
        private set

    // 注：不能写成 `var type` + `fun setType()` —— 属性 setter 与同名方法的 JVM 签名相同
    // （`setType(String)V`），会触发 platform declaration clash。对外只读、切换走 setType()。
    private var typeState by mutableStateOf<String?>(null)

    /** 当前类型筛选：null = 全部，其余为 BLOG / ESSAY / PROJECT / DOC */
    val type: String? get() = typeState

    var results by mutableStateOf<List<SearchResultItem>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var searched by mutableStateOf(false)
        private set

    override var refreshing by mutableStateOf(false)
        private set

    private var debounceJob: Job? = null

    /** 在飞的那一次搜索请求：换词/换类型时取消，避免旧结果覆盖新结果 */
    private var searchJob: Job? = null

    /** 请求代数：输入变化即作废在飞的旧词请求，防旧结果覆盖新词 */
    private var searchGeneration = 0

    fun onQueryChange(q: String) {
        searchGeneration++
        searchJob?.cancel()
        query = q
        if (q.isBlank()) {
            debounceJob?.cancel()
            results = emptyList()
            error = null
            searched = false
            loading = false
            refreshing = false
            return
        }
        // 输入停顿 350ms 后自动搜索（对齐 web handleSearch 的 DEBOUNCE_DELAY）
        scheduleSearch(DEBOUNCE_MS)
    }

    /** 切换类型：以当前关键词重搜（关键词为空时只改选中态，不发请求） */
    fun setType(t: String?) {
        if (t == typeState) return
        typeState = t
        if (query.isBlank()) {
            results = emptyList()
            searched = false
            return
        }
        searchGeneration++
        searchJob?.cancel()
        // 点 chips 是明确动作，不再等 350ms（仍走同一套去重/缓存逻辑）
        scheduleSearch(0L)
    }

    fun submit() = doSearch(force = false)

    /** 下拉刷新：作废「该词 + 该类型」的缓存、强制走网络；用 refreshing 走顶部指示器（不闪骨架屏） */
    override fun refresh() = doSearch(force = true)

    private fun scheduleSearch(delayMs: Long) {
        debounceJob?.cancel()
        debounceJob = viewModelScope.launch {
            if (delayMs > 0) delay(delayMs)
            submit()
        }
    }

    private fun doSearch(force: Boolean) {
        val q = query.trim()
        if (q.isEmpty()) return
        val t = typeState
        val key = MemoryCache.searchKey(q, t)
        if (!force) {
            // 结果缓存命中：不再发请求（同词同类型，5 分钟有效）
            MemoryCache.searchResult(q, t)?.let { cached ->
                results = cached
                error = null
                searched = true
                // 上一次请求可能被取消在「loading 已置 true」的时刻，这里必须收尾，否则骨架屏卡住
                loading = false
                refreshing = false
                return
            }
        } else {
            MemoryCache.invalidateSearch(q, t)
        }
        // 同词同类型请求去重（防抖与回车同时触发）；此时在飞的也是同一个键，不要取消它
        if (!MemoryCache.beginSearch(key)) return
        searchJob?.cancel()
        val gen = searchGeneration
        searchJob = viewModelScope.launch {
            if (force) refreshing = true else loading = true
            error = null
            try {
                val res = repo.search(q, t)
                if (gen != searchGeneration) return@launch
                if (res.flag) {
                    results = res.data ?: emptyList()
                    if (results.isNotEmpty()) MemoryCache.putSearchResult(q, t, results)
                } else error = res.message.ifBlank { "搜索失败" }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (gen != searchGeneration) return@launch
                error = e.message?.takeIf { it.isNotBlank() } ?: "网络错误"
            } finally {
                // 只清自己那条在飞标记，别把后续请求的标记顺手清掉
                MemoryCache.endSearch(key)
            }
            if (gen == searchGeneration) {
                loading = false
                refreshing = false
                searched = true
            }
        }
    }

    private companion object {
        const val DEBOUNCE_MS = 350L
    }
}
