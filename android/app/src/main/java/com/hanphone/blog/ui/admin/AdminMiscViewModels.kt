package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.util.decoded
import com.hanphone.blog.util.normalized
import com.hanphone.blog.data.model.AdminCollectRun
import com.hanphone.blog.data.model.AdminRebuildSummary
import com.hanphone.blog.data.model.AdminSummarySettings
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/** 友链：审核（发布）、推荐、增删改 */
@HiltViewModel
class AdminFriendLinksViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var items by mutableStateOf<List<FriendLink>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                // 后台接口同样会把 URL 里的 & 存成 &amp;（qlogo 头像就是），这里必须和公开友链页走同一套归一化
                items = repo.friendLinks().data.orEmpty().normalized()
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun save(link: FriendLink, done: () -> Unit) {
        if (link.name.isBlank() || link.url.isBlank()) {
            message = "名称与链接不能为空"
            return
        }
        viewModelScope.launch {
            try {
                val res = repo.saveFriendLink(link.decoded())
                if (res.flag) {
                    done()
                    refresh()
                } else {
                    message = res.message.ifBlank { "保存失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("保存失败")
            }
        }
    }

    fun togglePublished(link: FriendLink) {
        viewModelScope.launch {
            runCatching { repo.toggleFriendLinkPublished(link) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == link.id) it.copy(published = link.published != true) else it }
                    else message = res.message.ifBlank { "操作失败" }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun toggleRecommend(link: FriendLink) {
        viewModelScope.launch {
            runCatching { repo.toggleFriendLinkRecommend(link) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == link.id) it.copy(recommend = !link.recommend) else it }
                    else message = res.message.ifBlank { "操作失败" }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun delete(link: FriendLink) {
        viewModelScope.launch {
            runCatching { repo.deleteFriendLink(link.id) }
                .onSuccess { res ->
                    if (res.flag) items = items.filterNot { it.id == link.id }
                    else message = res.message.ifBlank { "删除失败" }
                }
                .onFailure { message = it.adminMessage("删除失败") }
        }
    }

    fun consumeMessage() { message = null }
}

/** 项目：发布、推荐、增删改 */
@HiltViewModel
class AdminProjectsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var items by mutableStateOf<List<Project>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                items = repo.projects().data.orEmpty()
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun save(project: Project, done: () -> Unit) {
        if (project.title.isBlank()) {
            message = "标题不能为空"
            return
        }
        viewModelScope.launch {
            runCatching { repo.saveProject(project) }
                .onSuccess { res ->
                    if (res.flag) { done(); refresh() } else message = res.message.ifBlank { "保存失败" }
                }
                .onFailure { message = it.adminMessage("保存失败") }
        }
    }

    fun togglePublished(project: Project) {
        viewModelScope.launch {
            runCatching { repo.toggleProjectPublished(project) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == project.id) it.copy(published = project.published != true) else it }
                    else message = res.message.ifBlank { "操作失败" }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun toggleRecommend(project: Project) {
        viewModelScope.launch {
            runCatching { repo.toggleProjectRecommend(project) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == project.id) it.copy(recommend = !project.recommend) else it }
                    else message = res.message.ifBlank { "操作失败" }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun delete(project: Project) {
        viewModelScope.launch {
            runCatching { repo.deleteProject(project.id) }
                .onSuccess { res ->
                    if (res.flag) items = items.filterNot { it.id == project.id }
                    else message = res.message.ifBlank { "删除失败" }
                }
                .onFailure { message = it.adminMessage("删除失败") }
        }
    }

    fun consumeMessage() { message = null }
}

/** 文库：发布、推荐、删除；新增走「上传文件 + 填元数据」 */
@HiltViewModel
class AdminDocsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var items by mutableStateOf<List<Doc>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                items = repo.docs().data.orEmpty()
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun save(doc: Map<String, Any?>, done: () -> Unit) {
        viewModelScope.launch {
            runCatching { repo.saveDoc(doc) }
                .onSuccess { res ->
                    if (res.flag) { done(); refresh() } else message = res.message.ifBlank { "保存失败" }
                }
                .onFailure { message = it.adminMessage("保存失败") }
        }
    }

    fun togglePublished(doc: Doc) {
        viewModelScope.launch {
            runCatching { repo.toggleDocPublished(doc) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == doc.id) it.copy(published = doc.published != true) else it }
                    else message = res.message.ifBlank { "操作失败" }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun toggleRecommend(doc: Doc) {
        viewModelScope.launch {
            runCatching { repo.toggleDocRecommend(doc) }
                .onSuccess { res ->
                    if (res.flag) items = items.map { if (it.id == doc.id) it.copy(recommend = !doc.recommend) else it }
                    else message = res.message.ifBlank { "操作失败" }
                }
                .onFailure { message = it.adminMessage("操作失败") }
        }
    }

    fun delete(doc: Doc) {
        viewModelScope.launch {
            runCatching { repo.deleteDoc(doc.id) }
                .onSuccess { res ->
                    if (res.flag) items = items.filterNot { it.id == doc.id }
                    else message = res.message.ifBlank { "删除失败" }
                }
                .onFailure { message = it.adminMessage("删除失败") }
        }
    }

    /** 上传文件到指定命名空间，返回 (filename, fileType) */
    suspend fun uploadDoc(file: java.io.File, mimeType: String, namespace: String): Pair<String, String>? {
        val item = repo.uploadFile(file, namespace, mimeType)
        if (!item.success || item.url == null) {
            message = item.error ?: "上传失败"
            return null
        }
        val filename = item.url.substringAfterLast('/')
        val fileType = filename.substringAfterLast('.', "").uppercase()
        return filename to fileType
    }

    fun consumeMessage() { message = null }
}

/** 用户：只读列表（不做删除/重置密码——手机上误触代价太大） */
@HiltViewModel
class AdminUsersViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var all by mutableStateOf<List<User>>(emptyList())
        private set
    var keyword by mutableStateOf("")
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    val filtered: List<User>
        get() {
            val k = keyword.trim()
            if (k.isEmpty()) return all
            return all.filter {
                (it.nickname ?: "").contains(k, ignoreCase = true) ||
                    (it.username ?: "").contains(k, ignoreCase = true) ||
                    (it.email ?: "").contains(k, ignoreCase = true)
            }
        }

    init { refresh() }

    fun search(v: String) { keyword = v }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                all = repo.users().data.orEmpty()
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun consumeMessage() { message = null }
}

/**
 * 聚合数据：对标网页后台 `/admin/insight`。
 *
 * 采集状态 + 信源健康度、AI 摘要配置（含启用开关 / 测试）、采集记录（筛选 + 分页）、
 * 模型归一重建。采集是服务端异步任务，触发后每 3 秒轮询一次状态，完成后刷新信源与记录。
 */
@HiltViewModel
class AdminInsightViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var running by mutableStateOf(false)
        private set
    var loading by mutableStateOf(true)
        private set
    var collecting by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    // ===== 信源 =====
    var sources by mutableStateOf<List<HotSourceStatus>>(emptyList())
        private set
    val healthyCount: Int get() = sources.count { it.lastStatus == "SUCCESS" }

    // ===== 采集记录 =====
    var runs by mutableStateOf<List<AdminCollectRun>>(emptyList())
        private set
    var runTotal by mutableStateOf(0L)
        private set
    var runPages by mutableStateOf(1)
        private set
    /** 0 起始（后端 /runs/page 口径） */
    var runPage by mutableStateOf(0)
        private set
    var runsLoading by mutableStateOf(false)
        private set
    var filterTrigger by mutableStateOf("")
        private set
    /** 空 / success / partial / failed */
    var filterResult by mutableStateOf("")
        private set
    /** newest / oldest */
    var order by mutableStateOf("newest")
        private set
    /** 时间范围："" 全部 / "7" / "30" 天 */
    var filterRange by mutableStateOf("")
        private set
    var runKeyword by mutableStateOf("")
        private set

    // ===== AI 摘要配置 =====
    var summary by mutableStateOf<AdminSummarySettings?>(null)
        private set
    var summaryBaseUrl by mutableStateOf("")
        private set
    var summaryModel by mutableStateOf("")
        private set
    var summaryApiKey by mutableStateOf("")
        private set
    var summaryHeaders by mutableStateOf("")
        private set
    var savingSummary by mutableStateOf(false)
        private set
    var togglingSummary by mutableStateOf(false)
        private set
    var testingSummary by mutableStateOf(false)
        private set
    var testResult by mutableStateOf<String?>(null)
        private set

    // ===== 模型归一重建 =====
    var rebuildBusy by mutableStateOf(false)
        private set
    var rebuildSummary by mutableStateOf<AdminRebuildSummary?>(null)
        private set

    private var searchJob: Job? = null

    init { loadAll() }

    fun loadAll() {
        viewModelScope.launch {
            loading = true
            try {
                val statusDeferred = async { runCatching { repo.hotStatus() }.getOrNull() }
                val sourcesDeferred = async { runCatching { repo.hotSources() }.getOrDefault(emptyList()) }
                val summaryDeferred = async { runCatching { repo.summarySettings() }.getOrNull() }
                val runsDeferred = async {
                    runCatching {
                        repo.hotRuns(
                            page = runPage,
                            size = RUN_SIZE,
                            triggerType = filterTrigger,
                            result = filterResult,
                            keyword = runKeyword,
                            order = order,
                            from = rangeStart()
                        )
                    }.getOrNull()
                }
                running = statusDeferred.await()?.data?.get("running") == true
                sources = sourcesDeferred.await()
                summaryDeferred.await()?.let { applySummary(it) }
                runsDeferred.await()?.let { applyRuns(it.content, it.totalElements, it.totalPages) }
            } finally {
                loading = false
            }
        }
    }

    fun refreshStatus() {
        viewModelScope.launch {
            loading = true
            try {
                running = repo.hotStatus().data?.get("running") == true
                sources = runCatching { repo.hotSources() }.getOrDefault(sources)
            } catch (e: Exception) {
                message = e.adminMessage("获取状态失败")
            } finally {
                loading = false
            }
        }
    }

    fun collect() {
        if (collecting) return
        viewModelScope.launch {
            collecting = true
            try {
                val res = repo.collectHot()
                if (!res.flag) {
                    message = res.message.ifBlank { "触发失败" }
                    return@launch
                }
                running = true
                message = if (res.data?.get("started") == true) "采集已开始" else "采集正在进行中"
                // 服务端异步采集：每 3 秒看一次，最长约 3 分钟
                var finished = false
                for (i in 0 until 60) {
                    delay(3000)
                    val stillRunning = runCatching { repo.hotStatus() }.getOrNull()
                        ?.data?.get("running") == true
                    running = stillRunning
                    if (!stillRunning) {
                        finished = true
                        break
                    }
                }
                sources = runCatching { repo.hotSources() }.getOrDefault(sources)
                loadRuns()
                message = if (finished) "采集完成" else "采集仍在后台进行，可稍后刷新"
            } catch (e: Exception) {
                message = e.adminMessage("触发采集失败")
            } finally {
                collecting = false
            }
        }
    }

    // ===== 采集记录筛选 =====

    fun setTrigger(value: String) {
        if (value == filterTrigger) return
        filterTrigger = value
        runPage = 0
        loadRuns()
    }

    fun setResult(value: String) {
        if (value == filterResult) return
        filterResult = value
        runPage = 0
        loadRuns()
    }

    fun updateOrder(value: String) {
        if (value == order) return
        order = value
        runPage = 0
        loadRuns()
    }

    fun setRange(value: String) {
        if (value == filterRange) return
        filterRange = value
        runPage = 0
        loadRuns()
    }

    /** 关键词防抖 350ms（对齐网页） */
    fun searchRuns(value: String) {
        runKeyword = value
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            runPage = 0
            loadRuns()
        }
    }

    fun resetRunFilters() {
        filterTrigger = ""
        filterResult = ""
        order = "newest"
        filterRange = ""
        runKeyword = ""
        runPage = 0
        loadRuns()
    }

    fun goRunPage(target: Int) {
        val safe = target.coerceIn(0, runPages - 1)
        if (safe == runPage) return
        runPage = safe
        loadRuns()
    }

    fun loadRuns() {
        viewModelScope.launch {
            runsLoading = true
            try {
                val page = repo.hotRuns(
                    page = runPage,
                    size = RUN_SIZE,
                    triggerType = filterTrigger,
                    result = filterResult,
                    keyword = runKeyword,
                    order = order,
                    from = rangeStart()
                )
                applyRuns(page.content, page.totalElements, page.totalPages)
                if (page.content.isEmpty() && page.totalPages > 0 && runPage >= page.totalPages) {
                    runPage = page.totalPages - 1
                    loadRuns()
                }
            } catch (e: Exception) {
                message = e.adminMessage("加载采集记录失败")
            } finally {
                runsLoading = false
            }
        }
    }

    /** 「近 N 天」换算成后端需要的开始日期 */
    private fun rangeStart(): String? = when (filterRange) {
        "7" -> LocalDate.now().minusDays(6).toString()
        "30" -> LocalDate.now().minusDays(29).toString()
        else -> null
    }

    private fun applyRuns(list: List<AdminCollectRun>, total: Long, pages: Int) {
        runs = list
        runTotal = total
        runPages = pages.coerceAtLeast(1)
    }

    // ===== AI 摘要 =====

    private fun applySummary(settings: AdminSummarySettings) {
        summary = settings
        summaryBaseUrl = settings.baseUrl.orEmpty()
        summaryModel = settings.model.orEmpty()
        summaryHeaders = settings.headers.orEmpty()
        summaryApiKey = ""
    }

    fun updateSummaryBaseUrl(value: String) { summaryBaseUrl = value }
    fun updateSummaryModel(value: String) { summaryModel = value }
    fun updateSummaryApiKey(value: String) { summaryApiKey = value }
    fun updateSummaryHeaders(value: String) { summaryHeaders = value }

    fun saveSummary() {
        viewModelScope.launch {
            savingSummary = true
            try {
                val body = mutableMapOf(
                    "baseUrl" to summaryBaseUrl.trim(),
                    "model" to summaryModel.trim(),
                    "headers" to summaryHeaders.trim()
                )
                if (summaryApiKey.isNotBlank()) body["apiKey"] = summaryApiKey.trim()
                val settings = repo.saveSummarySettings(body)
                applySummary(settings)
                message = "摘要配置已保存"
            } catch (e: Exception) {
                message = e.adminMessage("保存摘要配置失败")
            } finally {
                savingSummary = false
            }
        }
    }

    /** 启用 / 暂停：只改开关，不改已保存的 URL / Key / Model / Header */
    fun toggleSummary() {
        val current = summary ?: return
        viewModelScope.launch {
            togglingSummary = true
            try {
                val next = !current.toggleEnabled
                val settings = repo.saveSummarySettings(mapOf("enabled" to next.toString()))
                applySummary(settings)
                message = if (next) "AI 摘要已启用" else "AI 摘要已暂停"
            } catch (e: Exception) {
                message = e.adminMessage("切换失败")
            } finally {
                togglingSummary = false
            }
        }
    }

    fun testSummary() {
        viewModelScope.launch {
            testingSummary = true
            testResult = null
            try {
                val res = repo.testSummary()
                testResult = if (res.flag) "成功：${res.data.orEmpty()}" else "失败：${res.message.ifBlank { "未知错误" }}"
            } catch (e: Exception) {
                testResult = "失败：${e.adminMessage("请求异常")}"
            } finally {
                testingSummary = false
            }
        }
    }

    // ===== 模型归一重建 =====

    fun rebuild(dryRun: Boolean) {
        if (rebuildBusy) return
        viewModelScope.launch {
            rebuildBusy = true
            try {
                rebuildSummary = repo.rebuildNormalization(dryRun)
                message = if (dryRun) "预演完成" else "模型归一重建完成"
                if (!dryRun) {
                    sources = runCatching { repo.hotSources() }.getOrDefault(sources)
                    loadRuns()
                }
            } catch (e: Exception) {
                message = e.adminMessage("模型归一重建失败")
            } finally {
                rebuildBusy = false
            }
        }
    }

    fun consumeMessage() { message = null }

    fun consumeTestResult() { testResult = null }

    companion object {
        const val RUN_SIZE = 10
    }
}
