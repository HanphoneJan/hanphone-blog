package com.hanphone.blog.ui.admin

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.api.FileEntry
import com.hanphone.blog.data.api.FilesResult
import com.hanphone.blog.data.api.SimpleFileResult
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.util.adminMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import retrofit2.HttpException
import java.io.File
import javax.inject.Inject

/**
 * 后台「文件管理」（admin-file 目录浏览 / 上传 / 删除）。
 *
 * 与服务端行为对齐的几条约定：
 * - `path = null` 是根目录，`GET /files` 此时返回的是各**命名空间**（目录）本身；
 * - 删除目录必须 `recursive=true`（服务端对非空目录直接 400），根级条目就是整个命名空间；
 * - 上传落点 = 当前目录，根目录下固定落到 `blog`（与网页版一致）；
 * - 服务端一次最多收 20 个文件（multer `upload.array("files", 20)`），超出的截断并提示。
 *
 * 所有网络调用都在这里 try/catch，异常不冒泡到 UI（HANDOVER 规矩 4）。
 */
@HiltViewModel
class AdminFilesViewModel @Inject constructor(
    private val repo: AdminRepository,
    @ApplicationContext private val appContext: Context
) : ViewModel(), PullRefreshHost {

    companion object {
        /** 服务端 `upload.array("files", 20)` 的上限 */
        const val MAX_UPLOAD = 20
    }

    /** 当前目录：null = 根目录 */
    var path by mutableStateOf<String?>(null)
        private set
    var items by mutableStateOf<List<FileEntry>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var uploading by mutableStateOf(false)
        private set
    var creating by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    // 首屏用骨架屏，刷新/翻目录时不再让下拉圈圈顶在最上面
    override val refreshing: Boolean get() = loading && items.isNotEmpty()

    init { load() }

    /** 进入指定目录（null = 根目录） */
    fun open(target: String?) {
        val normalized = target?.trim('/')?.takeIf { it.isNotBlank() }
        if (normalized == path) return
        path = normalized
        items = emptyList()
        load()
    }

    /** 返回上一级；已经在根目录时返回 false（由页面决定是否退出） */
    fun up(): Boolean {
        val current = path ?: return false
        val parent = current.substringBeforeLast('/', "")
        open(parent.ifBlank { null })
        return true
    }

    override fun refresh() = load()

    fun consumeMessage() {
        message = null
    }

    private fun load() {
        val namespace = path
        viewModelScope.launch {
            loading = true
            try {
                val res = repo.files(namespace)
                // 快速连点目录时可能有两个请求在飞：只认当前目录的结果
                if (path != namespace) return@launch
                applyResult(res)
            } catch (e: Exception) {
                if (path == namespace) onLoadFailure(e)
            } finally {
                if (path == namespace) loading = false
            }
        }
    }

    private fun applyResult(res: FilesResult) {
        val failure = res.error?.takeIf { it.isNotBlank() }
        if (failure != null || res.code !in 200..299) {
            error = failure ?: "获取文件列表失败"
            // 已有列表时保留旧内容，只提示（避免翻页网络抖动把整屏清空）
            if (items.isNotEmpty()) message = error
            return
        }
        error = null
        items = res.items.sortedWith(
            compareByDescending<FileEntry> { it.isDirectory }.thenBy { it.name.lowercase() }
        )
    }

    private fun onLoadFailure(e: Exception) {
        val text = fileMessage(e, "获取文件列表失败")
        error = text
        if (items.isNotEmpty()) {
            message = text
        }
    }

    /** 新建文件夹；成功回调 done（页面据此关掉弹窗），失败只提示并保持弹窗 */
    fun createDirectory(name: String, done: () -> Unit) {
        if (creating) return
        val target = name.trim()
        if (target.isBlank()) {
            message = "文件夹名称不能为空"
            return
        }
        if (target.contains('/') || target.contains('\\')) {
            message = "名称不能包含 /"
            return
        }
        creating = true
        viewModelScope.launch {
            try {
                val res = repo.createDirectory(target, path)
                val failure = res.failure("创建文件夹失败")
                if (failure != null) {
                    message = failure
                } else {
                    done()
                    load()
                }
            } catch (e: Exception) {
                message = fileMessage(e, "创建文件夹失败")
            } finally {
                creating = false
            }
        }
    }

    /**
     * 删除文件/目录。目录一律 recursive（服务端对非空目录会拒绝），
     * 根级条目就是整个命名空间，页面侧已做二次确认。
     */
    fun delete(entry: FileEntry) {
        val dir = path
        viewModelScope.launch {
            try {
                val res = repo.deleteFileEntry(
                    name = entry.name,
                    namespace = dir,
                    recursive = entry.isDirectory
                )
                val failure = res.failure("删除失败")
                if (failure != null) {
                    message = failure
                    return@launch
                }
                // 行已经从列表消失，本身就是反馈，不再弹「删除成功」（Toast 原则）
                if (path == dir) items = items.filterNot { it.name == entry.name }
            } catch (e: Exception) {
                message = fileMessage(e, "删除失败")
            }
        }
    }

    /**
     * 批量上传：Uri → 缓存临时文件 → `POST /upload/batch`，完成后刷新列表并回收临时文件。
     * 根目录下落到 `blog`（与网页版一致）。
     */
    fun upload(uris: List<Uri>) {
        if (uris.isEmpty() || uploading) return
        val pickedUris = uris.take(MAX_UPLOAD)
        if (uris.size > MAX_UPLOAD) {
            message = "一次最多上传 $MAX_UPLOAD 个，本次只上传前 $MAX_UPLOAD 个"
        }
        viewModelScope.launch {
            uploading = true
            // 每次上传用独立临时目录，目录内保留原始文件名：服务端按 multipart 文件名落盘，
            // 给缓存文件加前缀会直接把前缀写进线上的文件名。
            val batchDir = File(appContext.cacheDir, "adminfiles_${System.currentTimeMillis()}")
            try {
                val picked = pickedUris.mapNotNull { uri -> copyToCache(uri, batchDir) }
                if (picked.isEmpty()) {
                    message = "没有可上传的文件"
                    return@launch
                }
                val results = repo.uploadBatch(picked, path ?: "blog")
                val success = results.count { it.success }
                val failed = results.count { !it.success }
                message = if (failed > 0) {
                    "成功 $success 个，失败 $failed 个"
                } else {
                    "成功上传 $success 个"
                }
                if (success > 0) load()
            } catch (e: Exception) {
                message = fileMessage(e, "上传失败")
            } finally {
                uploading = false
                runCatching { batchDir.deleteRecursively() }
            }
        }
    }

    // ===== 内部工具 =====

    /** 服务端错误体是 `{ "error": "..." }`，优先用它给出具体文案（如「目录已存在」） */
    private fun fileMessage(e: Exception, fallback: String): String {
        if (e is HttpException) {
            val detail = runCatching {
                e.response()?.errorBody()?.string()
                    ?.let { JSONObject(it).optString("error") }
                    ?.takeIf { it.isNotBlank() }
            }.getOrNull()
            if (detail != null) return detail
        }
        return e.adminMessage(fallback)
    }

    private fun SimpleFileResult.failure(fallback: String): String? {
        val detail = error?.takeIf { it.isNotBlank() }
        if (detail != null) return detail
        return if (code in 200..299) null else message.ifBlank { fallback }
    }

    /** 复制到 cacheDir 下的批次临时目录（用完整目录删除）；保留原始文件名给服务端落盘 */
    private suspend fun copyToCache(uri: Uri, dir: File): Pair<File, String>? =
        withContext(Dispatchers.IO) {
            val resolver = appContext.contentResolver
            val rawName = queryDisplayName(resolver, uri)?.takeIf { it.isNotBlank() }
                ?: "upload_${System.currentTimeMillis()}"
            val safeName = rawName.replace('/', '_').replace('\\', '_').trim().ifBlank { "upload" }
            val temp = File(dir, safeName)
            val copied = runCatching {
                dir.mkdirs()
                resolver.openInputStream(uri)?.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                } != null
            }.getOrDefault(false)
            if (copied && temp.length() > 0) {
                temp to guessMime(resolver.getType(uri), safeName)
            } else {
                runCatching { temp.delete() }
                null
            }
        }

    private fun queryDisplayName(resolver: ContentResolver, uri: Uri): String? = runCatching {
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        }
    }.getOrNull()

    /** ContentResolver 给不出类型时按扩展名兜底；其余用二进制流（服务端只按扩展名分类） */
    private fun guessMime(resolverType: String?, name: String): String {
        if (!resolverType.isNullOrBlank() && resolverType != "application/octet-stream") return resolverType
        return when (name.substringAfterLast('.', "").lowercase()) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "bmp" -> "image/bmp"
            "svg" -> "image/svg+xml"
            "heic", "heif" -> "image/heic"
            "mp4", "m4v" -> "video/mp4"
            "mov" -> "video/quicktime"
            "webm" -> "video/webm"
            "mkv" -> "video/x-matroska"
            "avi" -> "video/x-msvideo"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "pdf" -> "application/pdf"
            "zip" -> "application/zip"
            "md" -> "text/markdown"
            "txt" -> "text/plain"
            "json" -> "application/json"
            else -> "application/octet-stream"
        }
    }
}
