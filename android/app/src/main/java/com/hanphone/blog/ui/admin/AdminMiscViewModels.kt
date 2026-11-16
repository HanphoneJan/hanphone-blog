package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
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
                items = repo.friendLinks().data.orEmpty()
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
                val res = repo.saveFriendLink(link)
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

/** 聚合数据：查看采集状态 + 立即触发采集 */
@HiltViewModel
class AdminInsightViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var running by mutableStateOf(false)
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init { refreshStatus() }

    fun refreshStatus() {
        viewModelScope.launch {
            loading = true
            try {
                running = repo.hotStatus().data?.get("running") == true
            } catch (e: Exception) {
                message = e.adminMessage("获取状态失败")
            } finally {
                loading = false
            }
        }
    }

    fun collect() {
        viewModelScope.launch {
            try {
                val res = repo.collectHot()
                running = res.data?.get("running") == true
                message = res.message.ifBlank { if (running) "采集进行中" else "采集已开始" }
            } catch (e: Exception) {
                message = e.adminMessage("触发失败")
            }
        }
    }

    fun consumeMessage() { message = null }
}
