package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.User
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.ui.components.ToastMessage
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.SearchField
import kotlinx.coroutines.launch
import java.util.UUID
import com.hanphone.blog.util.emailError
import com.hanphone.blog.util.nicknameError
import com.hanphone.blog.util.passwordError


/**
 * 文库维护。
 *
 * 新增流程对齐网页版：先把文件上传到 `docNamespace`，再用返回的文件名登记一条 Doc 记录
 * （docId 由前端生成：`doc-{时间戳}-{随机串}`）。
 */
@Composable
fun AdminDocsScreen(
    onBack: () -> Unit,
    vm: AdminDocsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<Doc?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Doc?>(null) }

    ToastMessage(vm.message, vm::consumeMessage)

    AdminScaffold(
        title = "文库管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } },
        refreshable = vm,
    ) {
        AdminListFrame(vm.loading, vm.items.isEmpty(), "还没有文库文件") {
            LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { doc ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f).padding(end = 6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    doc.title,
                                    style = MaterialTheme.typography.bodyLarge,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f, fill = false)
                                )
                                if (doc.recommend) {
                                    AdminStarMark(Modifier.padding(start = 6.dp))
                                }
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(top = 3.dp)
                            ) {
                                AdminBadge(doc.fileType.ifBlank { "FILE" }, MaterialTheme.colorScheme.secondary)
                                AdminBadge(
                                    if (doc.published == true) "已发布" else "草稿",
                                    if (doc.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                )
                                Text(
                                    "${doc.docNamespace} · ${doc.viewCount} 次",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        AdminRowMenu(
                            listOf(
                                AdminMenuAction(
                                    label = if (doc.published == true) "下线" else "发布",
                                    onClick = { vm.togglePublished(doc) }
                                ),
                                AdminMenuAction(label = "编辑", onClick = { editing = doc }),
                                AdminMenuAction(
                                    label = "删除",
                                    onClick = { pendingDelete = doc },
                                    destructive = true
                                )
                            )
                        )
                    }
                    AdminDivider()
                }
            }
        }
    }

    if (creating || editing != null) {
        DocDialog(
            initial = editing,
            vm = vm,
            onDismiss = { creating = false; editing = null },
            onSave = { payload -> vm.save(payload) { creating = false; editing = null } }
        )
    }

    pendingDelete?.let { doc ->
        AdminConfirmDialog(
            title = "删除文件记录",
            text = "「${doc.title}」的记录会被删除（物理文件需到文件服务清理），确定继续？",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(doc); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun DocDialog(
    initial: Doc?,
    vm: AdminDocsViewModel,
    onDismiss: () -> Unit,
    onSave: (Map<String, Any?>) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val toast = rememberToast()
    var title by remember { mutableStateOf(initial?.title.orEmpty()) }
    var description by remember { mutableStateOf(initial?.description.orEmpty()) }
    var namespace by remember { mutableStateOf(initial?.docNamespace?.ifBlank { "blog/docs" } ?: "blog/docs") }
    var filename by remember { mutableStateOf(initial?.filename.orEmpty()) }
    var fileType by remember { mutableStateOf(initial?.fileType.orEmpty()) }
    var uploading by remember { mutableStateOf(false) }
    var recommend by remember { mutableStateOf(initial?.recommend ?: false) }
    var published by remember { mutableStateOf(initial?.published != false) }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            uploading = true
            try {
                val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
                val name = queryName(context, uri) ?: "upload.bin"
                val temp = java.io.File(context.cacheDir, "doc_${System.currentTimeMillis()}_$name")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                }
                val uploaded = vm.uploadDoc(temp, mime, namespace.ifBlank { "blog/docs" })
                if (uploaded != null) {
                    filename = uploaded.first
                    fileType = uploaded.second
                    if (title.isBlank()) title = name.substringBeforeLast('.')
                }
                temp.delete()
            } finally {
                uploading = false
            }
        }
    }

    AdminFormDialog(
        title = if (initial == null) "新增文库文件" else "编辑文库文件",
        onDismiss = onDismiss,
        saving = uploading,
        onSave = {
            if (filename.isBlank()) {
                toast("请先上传文件")
            } else {
                val docId = initial?.docId?.takeIf { it.isNotBlank() }
                    ?: "doc-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}"
                val payload = mutableMapOf<String, Any?>(
                    "docId" to docId,
                    "title" to title.trim().ifBlank { filename },
                    "description" to description.trim(),
                    "filename" to filename,
                    "fileType" to fileType.ifBlank { filename.substringAfterLast('.', "").uppercase() },
                    "docNamespace" to namespace.trim().ifBlank { "blog/docs" },
                    "recommend" to recommend,
                    "published" to published
                )
                if (initial != null) payload["id"] = initial.id
                onSave(payload)
            }
        }
    ) {
        AdminField(title, { title = it }, "标题")
        AdminField(description, { description = it }, "简介", singleLine = false, minLines = 2)
        AdminField(namespace, { namespace = it }, "命名空间", placeholder = "blog/docs")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { filePicker.launch(arrayOf("*/*")) }, enabled = !uploading) {
                Text(if (uploading) "上传中…" else "选择并上传文件")
            }
        }
        Text(
            if (filename.isBlank()) "尚未选择文件" else "$filename（${fileType.ifBlank { "?" }}）",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        AdminSwitchRow("发布", published, { published = it })
        AdminSwitchRow("推荐", recommend, { recommend = it })
    }
}

private fun queryName(context: android.content.Context, uri: android.net.Uri): String? = runCatching {
    context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
        if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
    }
}.getOrNull()
