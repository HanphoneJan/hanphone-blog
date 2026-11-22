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
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.data.repo.EssayRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.hanphone.blog.data.cache.CachedList

/**
 * 首页状态。ViewModel 持有状态：
 * - 配置变更（旋转/深休眠）与页面返回（back stack 存活期）不再丢状态重拉；
 * - 三级数据源：MemoryCache（同步，返回秒显）→ ContentStore（磁盘，冷启动）→ 网络（始终刷新）。
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: BlogRepository,
    private val essayRepo: EssayRepository
) : ViewModel(), PullRefreshHost {

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

    override val refreshing: Boolean get() = isRefreshing

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

    // ===== 首页顶部「站点名片」与「最近随笔」=====
    // 统计从「我的」迁到首页：同一份数据（MemoryCache + ContentStore），冷启动先显缓存再刷新。
    var stats by mutableStateOf(MemoryCache.siteStats)
        private set
    var visits by mutableStateOf(MemoryCache.visitCount)
        private set

    /** 首页「最近随笔」预览：为空或请求失败时整块隐藏，不占用首页、不报错 */
    var recentEssays by mutableStateOf<List<Essay>>(emptyList())
        private set

    private val listCache = CachedList(
        memory = { MemoryCache.homeBlogs },
        writeMemory = { MemoryCache.homeBlogs = it },
        readDisk = { ContentStore.readHomeBlogs() },
        writeDisk = { ContentStore.writeHomeBlogs(it) }
    )

    /** 请求代数：每次新筛选/刷新/加载更多使旧的过期响应作废，防快速切换被旧结果覆盖 */
    private var loadGeneration = 0

    init {
        // 冷启动：先读磁盘缓存，再走网络
        viewModelScope.launch {
            listCache.seed()?.let { if (items.isEmpty()) { items = it; isLoading = false } }
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
        // 站点统计 / 最近随笔：独立协程，不阻塞文章列表首屏；失败静默
        viewModelScope.launch {
            val s = ContentStore.readSiteStats()
            if (s != null && stats == null) stats = s
            val v = ContentStore.readVisitCount()
            if (v != null && visits == null) visits = v
        }
        viewModelScope.launch { fetchStats() }
        viewModelScope.launch { fetchRecentEssays() }
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

    override fun refresh() {
        refresh(fromPull = true)
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (mode == "archive") loadArchive(fromPull) else loadLatest(reset = true, fromPull = fromPull)
            // 顺手刷新名片统计与最近随笔（下拉用于「看看有没有新东西」）
            fetchStats()
            fetchRecentEssays()
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
                    listCache.store(d.content)
                    MemoryCache.homePage = d.number + 1
                    MemoryCache.homeTotalPages = d.totalPages
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

    /** 站点统计 + 累计访问量（首页名片；失败保留旧值，不弹错） */
    private suspend fun fetchStats() {
        runCatching { repo.siteStats() }.onSuccess {
            if (it.flag && it.data != null) {
                stats = it.data
                MemoryCache.siteStats = it.data
                ContentStore.writeSiteStats(it.data)
            }
        }
        runCatching { repo.visitCount() }.onSuccess {
            if (it.flag && it.data != null) {
                visits = it.data
                MemoryCache.visitCount = it.data
                ContentStore.writeVisitCount(it.data)
            }
        }
    }

    /**
     * 最近随笔（首页横向预览）。
     * 取 6 条再过滤/截断：列表接口不会一次返回太多，够 4 个卡片即可。
     */
    private suspend fun fetchRecentEssays() {
        runCatching { essayRepo.essays(page = 1, pageSize = 6) }.onSuccess { res ->
            val list = res.data?.content
            if (res.flag && list != null) {
                recentEssays = list.filter { it.published != false }.take(4)
            }
        }
    }
}

private fun sortBlogs(list: List<Blog>, sort: String): List<Blog> = when (sort) {
    "oldest" -> list.sortedBy { it.createTime?.time ?: 0L }
    "recommend" -> list.sortedWith(compareByDescending<Blog> { it.recommend }.thenByDescending { it.createTime?.time ?: 0L })
    "mostViewed" -> list.sortedByDescending { it.views }
    "leastViewed" -> list.sortedBy { it.views }
    else -> list.sortedByDescending { it.createTime?.time ?: 0L }
}
