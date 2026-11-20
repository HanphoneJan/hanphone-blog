package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.AdminCollectRun
import com.hanphone.blog.data.model.AdminRebuildSummary
import com.hanphone.blog.data.model.AdminSummarySettings
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.data.repo.FileRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.util.MediaPicker
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.util.decoded
import com.hanphone.blog.util.normalized
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate
import javax.inject.Inject

/** 友链：审核（发布）、推荐、增删改 */
@HiltViewModel
class AdminFriendLinksViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<FriendLink>(paged = false) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<FriendLink> =
        AdminPage(repo.friendLinks().data.orEmpty().normalized())

    fun save(link: FriendLink, done: () -> Unit) {
        if (link.name.isBlank() || link.url.isBlank()) {
            notify("名称与链接不能为空")
            return
        }
        viewModelScope.launch {
            val err = adminOp("保存失败") { repo.saveFriendLink(link.decoded()) }
            if (err != null) return@launch notify(err)
            done()
            refresh()
        }
    }

    fun togglePublished(link: FriendLink) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleFriendLinkPublished(link) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == link.id) it.copy(published = link.published != true) else it }
        }
    }

    fun toggleRecommend(link: FriendLink) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleFriendLinkRecommend(link) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == link.id) it.copy(recommend = !link.recommend) else it }
        }
    }

    fun delete(link: FriendLink) {
        viewModelScope.launch {
            val err = adminOp("删除失败") { repo.deleteFriendLink(link.id) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == link.id }
        }
    }
}

/** 项目：发布、推荐、增删改 */
@HiltViewModel
class AdminProjectsViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<Project>(paged = false) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Project> =
        AdminPage(repo.projects().data.orEmpty())

    fun save(project: Project, done: () -> Unit) {
        if (project.title.isBlank()) {
            notify("标题不能为空")
            return
        }
        viewModelScope.launch {
            val err = adminOp("保存失败") { repo.saveProject(project) }
            if (err != null) return@launch notify(err)
            done()
            refresh()
        }
    }

    fun togglePublished(project: Project) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleProjectPublished(project) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == project.id) it.copy(published = project.published != true) else it }
        }
    }

    fun toggleRecommend(project: Project) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleProjectRecommend(project) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == project.id) it.copy(recommend = !project.recommend) else it }
        }
    }

    fun delete(project: Project) {
        viewModelScope.launch {
            val err = adminOp("删除失败") { repo.deleteProject(project.id) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == project.id }
        }
    }
}

/** 文库：发布、推荐、删除；新增走「上传文件 + 填元数据」 */
@HiltViewModel
class AdminDocsViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<Doc>(paged = false) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Doc> =
        AdminPage(repo.docs().data.orEmpty())

    fun save(doc: Map<String, Any?>, done: () -> Unit) {
        viewModelScope.launch {
            val err = adminOp("保存失败") { repo.saveDoc(doc) }
            if (err != null) return@launch notify(err)
            done()
            refresh()
        }
    }

    fun togglePublished(doc: Doc) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleDocPublished(doc) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == doc.id) it.copy(published = doc.published != true) else it }
        }
    }

    fun toggleRecommend(doc: Doc) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleDocRecommend(doc) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == doc.id) it.copy(recommend = !doc.recommend) else it }
        }
    }

    fun delete(doc: Doc) {
        viewModelScope.launch {
            val err = adminOp("删除失败") { repo.deleteDoc(doc.id) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == doc.id }
        }
    }

    /** 上传文件到指定命名空间，返回 (filename, fileType) */
    suspend fun uploadDoc(file: File, mimeType: String, namespace: String): Pair<String, String>? {
        val item = repo.uploadFile(file, namespace, mimeType)
        if (!item.success || item.url == null) {
            notify(item.error ?: "上传失败")
            return null
        }
        val filename = item.url.substringAfterLast('/')
        val fileType = filename.substringAfterLast('.', "").uppercase()
        return filename to fileType
    }
}

/** 用户管理：改资料 / 管理员权限 / 重置密码 / 删除（对齐网页后台 /admin/users） */
@HiltViewModel
class AdminUsersViewModel @Inject constructor(
    private val repo: AdminRepository,
    @ApplicationContext private val appContext: Context,
    private val fileRepo: FileRepository
) : AdminListViewModel<User>(paged = false) {

    var busy by mutableStateOf(false)
        private set
    var uploading by mutableStateOf(false)
        private set

    /** 当前登录的管理员 id */
    val selfId: Long? get() = TokenStore.userId.value

    /**
     * 保护账号：内置 id=1 与自己。
     * 与网页后台一致——不允许降级/删除（否则会把自己或初始管理员锁在门外）。
     */
    fun isProtected(user: User): Boolean = user.id == 1L || user.id == selfId

    val filtered: List<User>
        get() {
            val k = keyword.trim()
            if (k.isEmpty()) return items
            return items.filter {
                (it.nickname ?: "").contains(k, ignoreCase = true) ||
                    (it.username ?: "").contains(k, ignoreCase = true) ||
                    (it.email ?: "").contains(k, ignoreCase = true)
            }
        }

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<User> =
        AdminPage(repo.users().data.orEmpty())

    /** 保存资料（昵称/邮箱/头像）；头像先由 [uploadAvatar] 换成外链 URL */
    fun saveProfile(user: User, nickname: String, email: String, avatar: String, done: () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("保存失败") {
                repo.saveUser(
                    mapOf(
                        "id" to user.id,
                        "nickname" to nickname.trim(),
                        "email" to email.trim(),
                        "avatar" to avatar.trim()
                    )
                )
            }
            if (err == null) {
                items = items.map {
                    if (it.id == user.id) {
                        it.copy(nickname = nickname.trim(), email = email.trim(), avatar = avatar.trim())
                    } else it
                }
                notify("已保存")
                done()
            } else {
                notify(err)
            }
            busy = false
        }
    }

    /** 设为 / 取消管理员（POST /admin/user 只带 id + type，后端忽略其余 null 字段） */
    fun setAdmin(user: User, admin: Boolean) {
        if (busy || isProtected(user)) return
        viewModelScope.launch {
            busy = true
            val type = if (admin) "1" else "0"
            val err = adminOp("操作失败") { repo.saveUser(mapOf("id" to user.id, "type" to type)) }
            if (err == null) {
                items = items.map { if (it.id == user.id) it.copy(type = type) else it }
                notify(if (admin) "已设为管理员" else "已取消管理员")
            } else {
                notify(err)
            }
            busy = false
        }
    }

    /** 重置密码：传 md5(明文)，后端 bcrypt 存储；成功后该用户全端下线 */
    fun resetPassword(user: User, newPassword: String, done: () -> Unit) {
        if (busy) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("重置失败") { repo.resetUserPassword(user.id, newPassword) }
            if (err == null) {
                notify("密码已重置")
                done()
            } else {
                notify(err)
            }
            busy = false
        }
    }

    fun delete(user: User) {
        if (busy || isProtected(user)) return
        viewModelScope.launch {
            busy = true
            val err = adminOp("删除失败") { repo.deleteUser(user.id) }
            if (err == null) {
                items = items.filterNot { it.id == user.id }
                notify("已删除用户")
            } else {
                notify(err)
            }
            busy = false
        }
    }

    /** 从相册选头像 → 压缩 → 上传公共头像接口 → 回调外链 URL（失败传 null） */
    fun uploadAvatar(uri: Uri, done: (String?) -> Unit) {
        if (uploading) return
        viewModelScope.launch {
            uploading = true
            var temp: File? = null
            try {
                val media = MediaPicker.prepare(appContext, uri)
                temp = media.file
                val res = runCatching { fileRepo.uploadAvatar(media.file) }.getOrNull()
                val url = res?.url?.takeIf { it.isNotBlank() }
                if (url == null) notify("头像上传失败")
                done(url)
            } catch (e: Exception) {
                notify("头像上传失败")
                done(null)
            } finally {
                MediaPicker.cleanup(temp)
                uploading = false
            }
        }
    }
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
) : ViewModel(), PullRefreshHost {

    override val refreshing: Boolean get() = loading

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

    override fun refresh() = loadAll()

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
