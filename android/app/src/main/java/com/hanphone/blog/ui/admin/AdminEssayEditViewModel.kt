package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayFileUrl
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.util.MediaPicker
import com.hanphone.blog.util.UrlRules
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 随笔编辑（新建 / 修改）。
 *
 * 与网页版一致的三个行为：
 * 1. 新建后需要单独调 `published=true`（后端 /admin/essay 不读发布字段）
 * 2. 修改不会改变发布状态
 * 3. 附件上传到 `blog/essay/{标题}` 命名空间，服务端生成缩略图后回传 thumbPath
 */
@HiltViewModel
class AdminEssayEditViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val repo: AdminRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    /** 0 表示新建 */
    private val essayId: Long = savedStateHandle.get<Long>("essayId") ?: 0L

    val isNew: Boolean get() = essayId == 0L

    var title by mutableStateOf("")
        private set
    var content by mutableStateOf("")
        private set
    var files by mutableStateOf<List<EssayFileUrl>>(emptyList())
        private set
    var loading by mutableStateOf(!isNew)
        private set
    var saving by mutableStateOf(false)
        private set
    var uploadingLabel by mutableStateOf<String?>(null)
        private set
    var published by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set
    /** 保存成功后的完成信号（UI 消费后返回列表） */
    var saved by mutableStateOf(false)
        private set

    /** 本次会话刚上传、尚未入库的 URL：取消移除时要物理删除，避免孤儿文件 */
    private val unsavedUrls = mutableSetOf<String>()

    init {
        if (!isNew) load()
    }

    private fun load() {
        val cached = AdminEditBus.essay
        if (cached != null && cached.id == essayId) {
            apply(cached)
            return
        }
        // 进程被回收后没有交接对象：翻页找（管理端没有按 id 取单条的接口）
        viewModelScope.launch {
            try {
                var page = 1
                while (page <= 10) {
                    val res = repo.essays(page)
                    val found = res.data?.content?.firstOrNull { it.id == essayId }
                    if (found != null) {
                        apply(found)
                        return@launch
                    }
                    if (page >= (res.data?.totalPages ?: page)) break
                    page++
                }
                message = "找不到这篇随笔，可能已被删除"
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    private fun apply(essay: Essay) {
        title = essay.title
        content = essay.content
        files = essay.essayFileUrls
        published = essay.published == true
        loading = false
    }

    fun updateTitle(value: String) {
        title = value
    }

    fun updateContent(value: String) {
        content = value
    }

    /** 添加附件：图片会先压缩（长边 1600 / JPEG 0.85），视频原样上传 */
    fun addAttachments(uris: List<Uri>) {
        if (uris.isEmpty()) return
        viewModelScope.launch {
            val namespace = "blog/essay/${sanitizeTitleForPath(title.ifBlank { "未命名" })}"
            val picked = mutableListOf<Pair<java.io.File, String>>()
            try {
                uris.forEachIndexed { index, uri ->
                    uploadingLabel = "处理 ${index + 1}/${uris.size}"
                    val media = MediaPicker.prepare(appContext, uri)
                    picked += media.file to media.mimeType
                }
                uploadingLabel = "上传中…"
                val results = repo.uploadBatch(picked, namespace)
                val added = results.mapNotNull { item ->
                    if (!item.success || item.url == null) return@mapNotNull null
                    unsavedUrls += item.url
                    EssayFileUrl(
                        url = item.url,
                        urlType = kindOf(item.mimetype),
                        width = item.width,
                        height = item.height,
                        thumbPath = item.thumbPath
                    )
                }
                files = files + added
                val failed = results.count { !it.success }
                if (failed > 0) message = "$failed 个文件上传失败"
            } catch (e: Exception) {
                message = e.adminMessage("上传失败")
            } finally {
                MediaPicker.cleanup(*picked.map { it.first }.toTypedArray())
                uploadingLabel = null
            }
        }
    }

    /**
     * 手填外链附件（图片 / 视频 / 文件都收）。
     *
     * 外链不归后端管：**不进 `unsavedUrls`**，移除时不能顺手去删别人的文件；
     * 也拿不到宽高与缩略图，九宫格会回退原图。
     *
     * @return 是否已添加（UI 据此决定是否清空输入框）
     */
    fun addAttachmentUrl(raw: String): Boolean {
        if (!UrlRules.isHttpUrl(raw)) {
            message = "请输入 http:// 或 https:// 开头的地址"
            return false
        }
        val url = UrlRules.normalize(raw)
        if (files.any { it.url == url }) {
            message = "该地址已添加"
            return false
        }
        files = files + EssayFileUrl(
            url = url,
            urlType = UrlRules.mediaKindOf(url),
            width = null,
            height = null,
            thumbPath = null
        )
        return true
    }

    fun removeAttachment(index: Int) {
        val file = files.getOrNull(index) ?: return
        files = files.filterIndexed { i, _ -> i != index }
        // 仅回收「本次刚上传、还没入库」的文件；已入库的由后端在保存时回收
        val url = file.url
        if (url != null && url in unsavedUrls) {
            unsavedUrls.remove(url)
            viewModelScope.launch { runCatching { repo.deleteUploadedFile(url) } }
        }
    }

    fun save() {
        if (saving) return
        if (title.isBlank()) {
            message = "标题不能为空"
            return
        }
        if (content.isBlank()) {
            message = "内容不能为空"
            return
        }
        val userId = TokenStore.userId.value
        if (userId == null) {
            message = "登录态已失效，请重新登录"
            return
        }
        viewModelScope.launch {
            saving = true
            try {
                val res = repo.saveEssay(
                    id = if (isNew) null else essayId,
                    title = title.trim(),
                    content = content,
                    userId = userId,
                    files = files
                )
                if (!res.flag) {
                    message = res.message.ifBlank { "保存失败" }
                    return@launch
                }
                // 新建：对齐网页版「创建即发布」
                if (isNew) {
                    val newId = res.data?.id
                    if (newId != null) {
                        val publishedRes = repo.publishEssay(newId, true)
                        if (!publishedRes.flag) {
                            message = "已保存为草稿，但发布失败"
                            saved = true
                            return@launch
                        }
                    }
                }
                unsavedUrls.clear()
                AdminEditBus.essayDirty = true
                saved = true
            } catch (e: Exception) {
                message = e.adminMessage("保存失败")
            } finally {
                saving = false
            }
        }
    }

    fun consumeMessage() {
        message = null
    }

    /** 与 EssayFileUrl.urlType 的大写取值一致 */
    private fun kindOf(mime: String?): String = when {
        mime == null -> "OTHER"
        mime.startsWith("image/") -> "IMAGE"
        mime.startsWith("video/") -> "VIDEO"
        mime.startsWith("text/") -> "TEXT"
        else -> "OTHER"
    }

    private fun sanitizeTitleForPath(title: String): String {
        val cleaned = title
            .replace(Regex("""[\\/:*?"<>|\u0000-\u001f]"""), "")
            .replace(Regex("""\.{2,}"""), "")
            .trim()
            .take(60)
        return cleaned.ifBlank { "未命名" }
    }
}
