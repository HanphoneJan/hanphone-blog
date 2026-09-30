package com.hanphone.blog.ui.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 全局搜索 */
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

    fun onQueryChange(q: String) { query = q }

    fun submit() {
        val q = query.trim()
        if (q.isEmpty()) return
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val res = repo.search(q)
                if (res.flag) results = res.data ?: emptyList() else error = res.message.ifBlank { "搜索失败" }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
            searched = true
        }
    }
}
