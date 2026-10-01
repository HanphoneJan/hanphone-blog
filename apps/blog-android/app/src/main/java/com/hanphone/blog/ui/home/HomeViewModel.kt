package com.hanphone.blog.ui.home

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 首页状态。ViewModel 持有状态：
 * - 配置变更（旋转/深休眠）与页面返回（back stack 存活期）不再丢状态重拉；
 * - 三级数据源：MemoryCache（同步，返回秒显）→ ContentStore（磁盘，冷启动）→ 网络（始终刷新）。
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel() {

    var mode by mutableStateOf("latest")                 // latest / archive
        private set
    var selectedTypeId by mutableStateOf<Long?>(null)
        private set
    var selectedTagId by mutableStateOf<Long?>(null)
        private set
    var selectedYear by mutableStateOf<String?>(null)     // 归档年份筛选（VM 持有，Tab 切回不丢）
        private set
    var sortBy by mutableStateOf("newest")
        private set
    var types by mutableStateOf<List<Type>>(MemoryCache.homeTypes ?: emptyList())
        private set
    var tags by mutableStateOf<List<Tag>>(MemoryCache.homeTags ?: emptyList())
        private set

    var items by mutableStateOf(MemoryCache.homeBlogs ?: emptyList())
        private set
    var page by mutableIntStateOf(MemoryCache.homePage)
        private set
    var totalPages by mutableIntStateOf(MemoryCache.homeTotalPages)
        private set
    var isLoading by mutableStateOf(MemoryCache.homeBlogs == null)
        private set
    var isRefreshing by mutableStateOf(false)
        private set
    var loadingMore by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var archive by mutableStateOf<Map<String, List<Blog>>>(MemoryCache.archiveBlogs ?: emptyMap())
        private set
    var archiveLoading by mutableStateOf(false)
        private set
    var archiveError by mutableStateOf<String?>(null)
        private set

    /** 请求代数：每次新筛选/刷新/加载更多使旧的过期响应作废，防快速切换被旧结果覆盖 */
    private var loadGeneration = 0

    init {
        // 冷启动：先读磁盘缓存，再走网络
        viewModelScope.launch {
            val cached = ContentStore.readHomeBlogs()
            if (cached != null && items.isEmpty()) {
                items = cached
                isLoading = false
            }
        }
        // 冷启动：筛选元数据（分类/标签）+ 归档（筛选面板/归档视图秒显）
        viewModelScope.launch {
            val cachedTypes = ContentStore.readTypes()
            if (cachedTypes != null && types.isEmpty()) types = cachedTypes
            val cachedTags = ContentStore.readTags()
            if (cachedTags != null && tags.isEmpty()) tags = cachedTags
            val a = ContentStore.readArchive()
            if (a != null && archive.isEmpty()) archive = a
        }
        viewModelScope.launch {
            if (types.isEmpty()) runCatching { repo.fullTypes() }.onSuccess {
                if (it.flag) {
                    types = it.data ?: emptyList()
                    MemoryCache.homeTypes = types
                    ContentStore.writeTypes(types)
                }
            }
            if (tags.isEmpty()) runCatching { repo.fullTags() }.onSuccess {
                if (it.flag) {
                    tags = it.data ?: emptyList()
                    MemoryCache.homeTags = tags
                    ContentStore.writeTags(tags)
                }
            }
        }
        // 首次加载文章列表
        viewModelScope.launch { loadLatest(reset = true) }
    }

    fun selectType(id: Long?) {
        selectedTypeId = id
        selectedTagId = null
        viewModelScope.launch { loadLatest(reset = true) }
    }

    fun selectTag(id: Long?) {
        selectedTagId = id
        selectedTypeId = null
        viewModelScope.launch { loadLatest(reset = true) }
    }

    fun selectYear(year: String?) {
        selectedYear = year
    }

    fun clearFilter() {
        selectedTypeId = null
        selectedTagId = null
        selectedYear = null
        viewModelScope.launch { loadLatest(reset = true) }
    }

    fun switchMode(m: String) {
        if (mode == m) return
        mode = m
        if (mode == "archive" && archive.isEmpty()) {
            viewModelScope.launch { loadArchive() }
        }
    }

    fun changeSort(s: String) { sortBy = s }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (mode == "archive") loadArchive(fromPull) else loadLatest(reset = true, fromPull = fromPull)
        }
    }

    fun loadMore() {
        viewModelScope.launch { loadLatest(reset = false) }
    }

    private suspend fun loadLatest(reset: Boolean, fromPull: Boolean = false) {
        val gen = ++loadGeneration
        val target = if (reset) 1 else page + 1
        if (fromPull) isRefreshing = true else if (reset) isLoading = true else loadingMore = true
        try {
            val res = when {
                selectedTagId != null -> repo.blogsByTag(selectedTagId!!, target, 10)
                selectedTypeId != null -> repo.blogsByType(selectedTypeId!!, target, 10)
                else -> repo.blogs(target, 10)
            }
            // 期间有更新的筛选/刷新/翻页请求 → 丢弃过期响应，防止旧结果覆盖新筛选
            if (gen != loadGeneration) return
            if (res.flag && res.data != null) {
                val d = res.data
                items = if (reset) d.content else items + d.content
                page = d.number + 1
                totalPages = d.totalPages
                error = null
                // 仅缓存未筛选的默认列表，返回 / 切 Tab 时秒显
                if (reset && selectedTypeId == null && selectedTagId == null) {
                    MemoryCache.homeBlogs = d.content
                    MemoryCache.homePage = d.number + 1
                    MemoryCache.homeTotalPages = d.totalPages
                    ContentStore.writeHomeBlogs(d.content)
                }
            } else error = res.message.ifBlank { "加载失败" }
        } catch (e: Exception) {
            error = e.message ?: "网络错误"
        }
        isLoading = false
        isRefreshing = false
        loadingMore = false
    }

    private suspend fun loadArchive(fromPull: Boolean = false) {
        if (fromPull) isRefreshing = true else archiveLoading = true
        try {
            val res = repo.archiveBlog()
            if (res.flag && res.data != null) {
                archive = res.data
                MemoryCache.archiveBlogs = res.data
                ContentStore.writeArchive(res.data)
                archiveError = null
            } else archiveError = res.message.ifBlank { "加载失败" }
        } catch (e: Exception) {
            archiveError = e.message ?: "网络错误"
        }
        archiveLoading = false
        isRefreshing = false
    }
}

private fun sortBlogs(list: List<Blog>, sort: String): List<Blog> = when (sort) {
    "oldest" -> list.sortedBy { it.createTime?.time ?: 0L }
    "recommend" -> list.sortedWith(compareByDescending<Blog> { it.recommend }.thenByDescending { it.createTime?.time ?: 0L })
    "mostViewed" -> list.sortedByDescending { it.views }
    "leastViewed" -> list.sortedBy { it.views }
    else -> list.sortedByDescending { it.createTime?.time ?: 0L }
}
