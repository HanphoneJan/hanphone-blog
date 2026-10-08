package com.hanphone.blog.data.cache

import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotFeedItem
import com.hanphone.blog.data.model.HotOverview
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.BenchmarkMeta
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.model.ModelLeaderboard
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.Vendor

/**
 * 会话级内存缓存（进程存活期间有效）：
 * - 列表页返回 / Tab 切回时先用缓存立即渲染，再后台静默刷新；
 * - 详情页重复进入直接命中缓存秒开。
 * 仅作展示缓存，不做持久化，登录态等敏感数据仍走 DataStore。
 */
object MemoryCache {

    // ===== 首页文章流（默认「全部·最新」视角；筛选切换不写入） =====
    var homeBlogs: List<Blog>? = null
    var homePage: Int = 1
    var homeTotalPages: Int = 1

    // ===== 首页筛选元数据（分类/标签）+ 归档（冷启动秒显筛选面板/归档视图） =====
    var homeTypes: List<Type>? = null
    var homeTags: List<Tag>? = null
    var archiveBlogs: Map<String, List<Blog>>? = null

    // ===== 随笔动态流 =====
    var essayMoments: List<Essay>? = null
    var essayPage: Int = 1
    var essayTotalPages: Int = 1

    // ===== 我的页（站点统计 / 访问量） =====
    var siteStats: SiteStats? = null
    var visitCount: Long? = null

    // ===== 留言板 / 友链 / 项目 / 文库 =====
    var boardMessages: List<Message>? = null
    var friendLinks: List<FriendLink>? = null
    var projects: List<Project>? = null
    var docs: List<Doc>? = null

    // ===== 热点聚合（洞察）=====
    var hotOverview: HotOverview? = null
    var hotFeeds: Map<String, List<HotFeedItem>>? = null
    var hotSources: List<HotSourceStatus>? = null
    var hotBenchmarks: List<BenchmarkMeta>? = null
    var hotVendors: List<Vendor>? = null
    var hotLeaderboards: Map<String, ModelLeaderboard> = emptyMap()

    /** 设置页「数据管理 清除全部」：重置全部会话级缓存 */
    fun resetAll() {
        homeBlogs = null
        homePage = 1
        homeTotalPages = 1
        homeTypes = null
        homeTags = null
        archiveBlogs = null
        essayMoments = null
        essayPage = 1
        essayTotalPages = 1
        siteStats = null
        visitCount = null
        boardMessages = null
        friendLinks = null
        projects = null
        docs = null
        hotOverview = null
        hotFeeds = null
        hotSources = null
        hotBenchmarks = null
        hotVendors = null
        hotLeaderboards = emptyMap()
        searchCache.clear()
        searchInFlight = null
    }

    // ===== 搜索结果缓存（query → 结果，5 分钟有效，防重复搜索重复请求）=====
    private const val SEARCH_TTL = 5 * 60_000L
    private val searchCache = mutableMapOf<String, Pair<Long, List<SearchResultItem>>>()
    private var searchInFlight: String? = null

    fun searchResult(query: String): List<SearchResultItem>? =
        searchCache[query]?.takeIf { System.currentTimeMillis() - it.first < SEARCH_TTL }?.second

    fun putSearchResult(query: String, results: List<SearchResultItem>) {
        searchCache[query] = System.currentTimeMillis() to results
    }

    /** 同词请求去重：已在飞行中的搜索词返回 true（VM 侧短路） */
    fun beginSearch(query: String): Boolean {
        if (searchInFlight == query) return false
        searchInFlight = query
        return true
    }

    fun endSearch() { searchInFlight = null }

    // ===== 详情缓存（LRU，最多 12 篇） =====
    private const val MAX_DETAILS = 12

    private val articleDetails = object : LinkedHashMap<Long, Blog>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Long, Blog>) = size > MAX_DETAILS
    }

    private val essayDetails = object : LinkedHashMap<Long, Essay>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Long, Essay>) = size > MAX_DETAILS
    }

    fun articleDetail(id: Long): Blog? = articleDetails[id]

    fun putArticleDetail(id: Long, blog: Blog) {
        articleDetails[id] = blog
    }

    fun essayDetail(id: Long): Essay? = essayDetails[id]

    fun putEssayDetail(id: Long, essay: Essay) {
        essayDetails[id] = essay
    }
}
