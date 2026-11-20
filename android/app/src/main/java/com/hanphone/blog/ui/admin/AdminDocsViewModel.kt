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
