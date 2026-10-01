package com.hanphone.blog.ui.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 全局搜索（对齐 web Header 搜索：输入即搜 + 防抖；结果内存缓存 5 分钟） */
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel() {

    var query by mutableStateOf("")
        private set
    var results by mutableStateOf<List<SearchResultItem>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var searched by mutableStateOf(false)
        private set

    private var debounceJob: Job? = null

    /** 请求代数：输入变化即作废在飞的旧词请求，防旧结果覆盖新词 */
    private var searchGeneration = 0

    fun onQueryChange(q: String) {
        searchGeneration++
        query = q
        if (q.isBlank()) {
            debounceJob?.cancel()
            results = emptyList()
            searched = false
            loading = false
            return
        }
        // 输入停顿 350ms 后自动搜索（对齐 web handleSearch 的 DEBOUNCE_DELAY）
        debounceJob?.cancel()
        debounceJob = viewModelScope.launch {
            delay(350)
            submit()
        }
    }

    fun submit() {
        val q = query.trim()
        if (q.isEmpty()) return
        // 结果缓存命中：不再发请求（5 分钟有效）
        MemoryCache.searchResult(q)?.let { cached ->
            results = cached
            searched = true
            return
        }
        // 同词请求去重（防抖与回车同时触发）
        if (!MemoryCache.beginSearch(q)) return
        val gen = searchGeneration
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val res = repo.search(q)
                if (gen != searchGeneration) return@launch
                if (res.flag) {
                    results = res.data ?: emptyList()
                    if (results.isNotEmpty()) MemoryCache.putSearchResult(q, results)
                } else error = res.message.ifBlank { "搜索失败" }
            } catch (e: Exception) {
                if (gen != searchGeneration) return@launch
                error = e.message ?: "网络错误"
            } finally {
                MemoryCache.endSearch()
            }
            if (gen == searchGeneration) {
                loading = false
                searched = true
            }
        }
    }
}
