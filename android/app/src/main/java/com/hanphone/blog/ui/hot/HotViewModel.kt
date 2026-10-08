package com.hanphone.blog.ui.hot

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.data.model.BenchmarkMeta
import com.hanphone.blog.data.model.HotFeedItem
import com.hanphone.blog.data.model.HotOverview
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.LeaderboardTrend
import com.hanphone.blog.data.model.ModelBenchmarkRow
import com.hanphone.blog.data.model.ModelCompare
import com.hanphone.blog.data.model.ModelLeaderboard
import com.hanphone.blog.data.model.Vendor
import com.hanphone.blog.data.repo.HotRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 热点聚合三视图 */
enum class HotView { FEED, LEADERBOARD, COMPARE }

/** 对比页已选模型（displayName/vendor 会在对比结果返回后补全） */
data class SelectedModel(
    val modelKey: String,
    val displayName: String,
    val vendor: String? = null
)

/**
 * 热点聚合（洞察）：热点流 / 模型榜单 / 综合对比。
 *
 * 三层缓存：MemoryCache（进程内秒显）→ ContentStore（冷启动秒显）→ 网络静默刷新。
 * init 自己发起首载（HANDOVER 坑 4a：VM 化后若只读缓存不发请求会永远停在骨架屏）。
 * 榜单按需懒加载（进入「榜单」视图才拉 7 个模态），避免一次打开打 12+ 请求。
 */
@HiltViewModel
class HotViewModel @Inject constructor(
    private val repo: HotRepository
) : ViewModel() {

    companion object {
        val FEED_CATEGORIES = listOf("github", "hf", "ai-news")
        val MODALITIES = listOf("text", "coding", "agent", "embedding", "image", "video", "speech")

        /** 对比页默认预置的六家代表厂商（各取当前最强模型） */
        val SEED_VENDORS = listOf("DeepSeek", "Z.ai", "Kimi", "Anthropic", "OpenAI", "Google")
        const val MAX_COMPARE = 6
        const val FEED_LIMIT = 30
    }

    // ===== 首载 / 刷新状态 =====
    var loading by mutableStateOf(MemoryCache.hotOverview == null && MemoryCache.hotFeeds == null)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // ===== 数据 =====
    var overview by mutableStateOf(MemoryCache.hotOverview)
        private set
    var feeds by mutableStateOf(MemoryCache.hotFeeds ?: emptyMap())
        private set
    var sources by mutableStateOf(MemoryCache.hotSources ?: emptyList())
        private set
    var benchmarks by mutableStateOf(MemoryCache.hotBenchmarks ?: emptyList())
        private set
    var vendors by mutableStateOf(MemoryCache.hotVendors ?: emptyList())
        private set
    var leaderboards by mutableStateOf(MemoryCache.hotLeaderboards)
        private set

    // ===== 当前视图 / 筛选（页面不做业务 remember）=====
    var view by mutableStateOf(HotView.FEED)
        private set
    var activeCategory by mutableStateOf("all")
        private set
    var modality by mutableStateOf("text")
        private set

    // ===== 榜单懒加载 / 趋势 =====
    var leaderboardsLoading by mutableStateOf(false)
        private set
    var trend by mutableStateOf<LeaderboardTrend?>(null)
        private set
    var trendLoading by mutableStateOf(false)
        private set

    // ===== 对比 =====
    var selected by mutableStateOf<List<SelectedModel>>(emptyList())
        private set
    var compare by mutableStateOf<ModelCompare?>(null)
        private set
    var comparing by mutableStateOf(false)
        private set
    var modelQuery by mutableStateOf("")
        private set
    var modelResults by mutableStateOf<List<ModelBenchmarkRow>>(emptyList())
        private set
    var searching by mutableStateOf(false)
        private set

    /** 排序：newest（默认，越新越前）/ name / price / context */
    var modelSort by mutableStateOf("newest")
        private set

    /** 「按公司」当前选中厂商（规范名）及其模型列表 */
    var pickerVendor by mutableStateOf<String?>(null)
        private set
    var vendorModelList by mutableStateOf<List<ModelBenchmarkRow>>(emptyList())
        private set
    var pickerLoading by mutableStateOf(false)
        private set
    private var searchJob: Job? = null

    init {
        // 冷启动：先读磁盘缓存展示，再静默刷新（suspend 返回后二次判空，避免覆盖已到的网络数据）
        viewModelScope.launch {
            val cachedOverview = ContentStore.readHotOverview()
            if (overview == null && cachedOverview != null) {
                overview = cachedOverview
                MemoryCache.hotOverview = cachedOverview
            }
            val cachedFeeds = ContentStore.readHotFeeds()
            if (feeds.isEmpty() && cachedFeeds != null) {
                feeds = cachedFeeds
                MemoryCache.hotFeeds = cachedFeeds
            }
            val cachedSources = ContentStore.readHotSources()
            if (sources.isEmpty() && cachedSources != null) {
                sources = cachedSources
                MemoryCache.hotSources = cachedSources
            }
            val cachedBenchmarks = ContentStore.readHotBenchmarks()
            if (benchmarks.isEmpty() && cachedBenchmarks != null) {
                benchmarks = cachedBenchmarks
                MemoryCache.hotBenchmarks = cachedBenchmarks
            }
            val cachedVendors = ContentStore.readHotVendors()
            if (vendors.isEmpty() && cachedVendors != null) {
                vendors = cachedVendors
                MemoryCache.hotVendors = cachedVendors
            }
            val cachedBoards = ContentStore.readHotLeaderboards()
            if (leaderboards.isEmpty() && cachedBoards != null) {
                leaderboards = cachedBoards
                MemoryCache.hotLeaderboards = cachedBoards
            }
            // 缓存已到位即撤掉首载骨架
            if (feeds.isNotEmpty() || overview != null) loading = false
        }
        // 首次加载：必须由 VM 自己发起，否则永远停在骨架屏
        refresh()
    }

    fun switchView(v: HotView) {
        view = v
        when (v) {
            HotView.LEADERBOARD -> {
                // 缓存的 map 可能不完整（例如上次只成功解析了部分模态），缺哪个补哪个
                if (leaderboards.size < MODALITIES.size) loadLeaderboards()
                else if (trend == null) loadTrend()
            }
            HotView.COMPARE -> {
                // 选择器「按榜单 / 按公司」依赖完整榜单数据
                if (leaderboards.size < MODALITIES.size) loadLeaderboards()
                else seedCompareIfEmpty()
            }
            HotView.FEED -> {}
        }
    }

    fun selectCategory(key: String) {
        activeCategory = key
    }

    fun selectModality(m: String) {
        if (m == modality) return
        modality = m
        loadTrend()
    }

    /** 拉取总览 + 三分类热点流 + 信源 + 榜单元数据 + 精选模型（并行） */
    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else if (feeds.isEmpty() && overview == null) loading = true
            error = null

            val overviewReq: Deferred<ApiResult<HotOverview>?> = async {
                runCatching { repo.overview() }.getOrNull()
            }
            val sourcesReq: Deferred<ApiResult<List<HotSourceStatus>>?> = async {
                runCatching { repo.sources() }.getOrNull()
            }
            val benchmarksReq: Deferred<ApiResult<List<BenchmarkMeta>>?> = async {
                runCatching { repo.benchmarks() }.getOrNull()
            }
            val vendorsReq: Deferred<ApiResult<List<Vendor>>?> = async {
                runCatching { repo.vendors() }.getOrNull()
            }
            val feedReq: Map<String, Deferred<ApiResult<List<HotFeedItem>>?>> =
                FEED_CATEGORIES.associateWith { c ->
                    async { runCatching { repo.feed(c, FEED_LIMIT) }.getOrNull() }
                }

            var failure: String? = null

            overviewReq.await()?.let { res ->
                if (res.flag) {
                    res.data?.let { d ->
                        overview = d
                        MemoryCache.hotOverview = d
                        ContentStore.writeHotOverview(d)
                    }
                } else failure = res.message.ifBlank { "加载失败" }
            } ?: run { failure = failure ?: "网络错误" }

            sourcesReq.await()?.let { res ->
                if (res.flag) {
                    sources = res.data ?: emptyList()
                    MemoryCache.hotSources = sources
                    ContentStore.writeHotSources(sources)
                }
            }
            benchmarksReq.await()?.let { res ->
                if (res.flag) {
                    benchmarks = res.data ?: emptyList()
                    MemoryCache.hotBenchmarks = benchmarks
                    ContentStore.writeHotBenchmarks(benchmarks)
                }
            }
            vendorsReq.await()?.let { res ->
                if (res.flag) {
                    vendors = res.data ?: emptyList()
                    MemoryCache.hotVendors = vendors
                    ContentStore.writeHotVendors(vendors)
                }
            }

            val newFeeds = mutableMapOf<String, List<HotFeedItem>>()
            feedReq.forEach { (category, deferred) ->
                deferred.await()?.let { res ->
                    if (res.flag) newFeeds[category] = res.data ?: emptyList()
                }
            }
            if (newFeeds.isNotEmpty()) {
                feeds = newFeeds
                MemoryCache.hotFeeds = newFeeds
                ContentStore.writeHotFeeds(newFeeds)
            }

            if (overview == null && feeds.isEmpty()) error = failure ?: "加载失败"
            loading = false
            refreshing = false
        }
    }

    /** 下拉刷新榜单（强制重拉） */
    fun reloadLeaderboards() {
        if (leaderboardsLoading) return
        loadLeaderboards()
    }

    private fun loadLeaderboards() {
        viewModelScope.launch {
            leaderboardsLoading = true
            val requests = MODALITIES.map { m ->
                m to async { runCatching { repo.leaderboard(m) }.getOrNull() }
            }
            // 合并到已有 map：失败的模态保留旧数据，避免被空结果覆盖
            val map = leaderboards.toMutableMap()
            requests.forEach { (m, deferred) ->
                deferred.await()?.let { res ->
                    if (res.flag && res.data != null) map[m] = res.data
                }
            }
            if (map.isNotEmpty()) {
                leaderboards = map
                MemoryCache.hotLeaderboards = map
                ContentStore.writeHotLeaderboards(map)
            }
            // 当前模态无数据时回退到第一个有数据的模态
            if (map.isNotEmpty() && (map[modality]?.rows.isNullOrEmpty())) {
                modality = MODALITIES.firstOrNull { (map[it]?.rows?.size ?: 0) > 0 } ?: modality
            }
            leaderboardsLoading = false
            if (view == HotView.LEADERBOARD) loadTrend()
            if (view == HotView.COMPARE) seedCompareIfEmpty()
        }
    }

    fun loadTrend() {
        val m = modality
        viewModelScope.launch {
            trendLoading = true
            try {
                val res = repo.leaderboardTrend(m, 30, 5)
                trend = if (res.flag) res.data else null
            } catch (e: Exception) {
                trend = null
            }
            trendLoading = false
        }
    }

    // ===== 对比 =====

    /** 「按公司」选择厂商 → 拉取该公司模型（默认越新越前） */
    fun selectVendor(vendor: String) {
        pickerVendor = vendor
        loadVendorModels()
    }

    /** 排序切换：newest / name / price / context */
    fun chooseSort(sort: String) {
        if (sort == modelSort) return
        modelSort = sort
        if (!pickerVendor.isNullOrBlank()) loadVendorModels()
        if (modelQuery.isNotBlank()) {
            searchJob?.cancel()
            searchJob = viewModelScope.launch { runSearch(modelQuery.trim()) }
        }
    }

    fun loadVendorModels() {
        val vendor = pickerVendor ?: return
        viewModelScope.launch {
            pickerLoading = true
            try {
                val res = repo.listModels(null, vendor, modelSort, 100)
                if (res.flag) vendorModelList = res.data ?: emptyList()
            } catch (e: Exception) {
                vendorModelList = emptyList()
            }
            pickerLoading = false
        }
    }

    /** 输入即搜 + 300ms 防抖（对齐 web ComparePanel） */
    fun onModelQueryChange(q: String) {
        modelQuery = q
        searchJob?.cancel()
        if (q.isBlank()) {
            modelResults = emptyList()
            searching = false
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            runSearch(q.trim())
        }
    }

    private suspend fun runSearch(q: String) {
        searching = true
        try {
            val res = repo.listModels(q, null, modelSort, 30)
            if (res.flag) modelResults = res.data ?: emptyList()
        } catch (e: Exception) {
            modelResults = emptyList()
        }
        searching = false
    }

    /** 选择器切换：已选则移除，未选且未满则加入（不打断搜索框内容） */
    fun toggleModel(m: SelectedModel) {
        if (selected.any { it.modelKey == m.modelKey }) {
            removeModel(m.modelKey)
        } else if (selected.size < MAX_COMPARE) {
            selected = selected + m
            loadCompare()
        }
    }

    fun removeModel(key: String) {
        selected = selected.filter { it.modelKey != key }
        loadCompare()
    }

    /** 首次进入对比且未选模型时，默认选六家代表厂商各自最强（文本榜 aa_intelligence 排序）的模型 */
    private fun seedCompareIfEmpty() {
        if (selected.isNotEmpty() || compare != null) return
        val rows = leaderboards["text"]?.rows?.takeIf { it.isNotEmpty() }
            ?: leaderboards.values.flatMap { it.rows }
        if (rows.isEmpty()) return
        val picked = SEED_VENDORS.mapNotNull { vendor -> rows.firstOrNull { it.vendor == vendor } }
        if (picked.isEmpty()) return
        selected = picked.map { SelectedModel(it.modelKey, it.displayName, it.vendor) }
        loadCompare()
    }

    private fun loadCompare() {
        val keys = selected.map { it.modelKey }
        if (keys.isEmpty()) {
            compare = null
            return
        }
        viewModelScope.launch {
            comparing = true
            try {
                val res = repo.compare(keys)
                if (res.flag) {
                    val data = res.data
                    compare = data
                    // 补全展示名/厂商（分享链接还原或搜索结果仅含 key 时，避免只显示 key）
                    data?.models?.let { models ->
                        selected = selected.map { s ->
                            val m = models.find { it.modelKey == s.modelKey }
                            if (m != null && (s.displayName != m.displayName || s.vendor != m.vendor)) {
                                s.copy(displayName = m.displayName, vendor = m.vendor)
                            } else s
                        }
                    }
                }
            } catch (e: Exception) {
                // 对比失败保留上次结果，不弹错
            }
            comparing = false
        }
    }
}
