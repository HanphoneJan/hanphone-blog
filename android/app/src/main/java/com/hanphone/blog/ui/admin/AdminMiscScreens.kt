package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.User
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.SearchField
import kotlinx.coroutines.launch
import java.util.UUID

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

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "文库管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } }
    ) {
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("还没有文库文件")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { doc ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(doc.title, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
                                if (doc.recommend) AdminBadge("推荐", MaterialTheme.colorScheme.tertiary)
                                Text(
                                    "${doc.docNamespace} · ${doc.viewCount} 次",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        TextButton(onClick = { vm.togglePublished(doc) }) {
                            Text(if (doc.published == true) "下线" else "发布")
                        }
                        IconButton(onClick = { editing = doc }) {
                            Icon(Icons.Filled.Edit, "编辑", modifier = Modifier.size(18.dp))
                        }
                        IconButton(onClick = { pendingDelete = doc }) {
                            Icon(Icons.Filled.Delete, "删除", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                        }
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

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "新增文库文件" else "编辑文库文件") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                AdminField(title, { title = it }, "标题")
                AdminGap(8)
                AdminField(description, { description = it }, "简介", singleLine = false, minLines = 2)
                AdminGap(8)
                AdminField(namespace, { namespace = it }, "命名空间", placeholder = "blog/docs")
                AdminGap(8)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = {
                        filePicker.launch(arrayOf("*/*"))
                    }, enabled = !uploading) { Text(if (uploading) "上传中…" else "选择并上传文件") }
                }
                Text(
                    if (filename.isBlank()) "尚未选择文件" else "$filename（${fileType.ifBlank { "?" }}）",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                AdminGap(8)
                AdminSwitchRow("发布", published, { published = it })
                AdminSwitchRow("推荐", recommend, { recommend = it })
            }
        },
        confirmButton = {
            TextButton(onClick = {
                if (filename.isBlank()) {
                    Toast.makeText(context, "请先上传文件", Toast.LENGTH_SHORT).show()
                    return@TextButton
                }
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
            }) { Text("保存") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}

private fun queryName(context: android.content.Context, uri: android.net.Uri): String? = runCatching {
    context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
        if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
    }
}.getOrNull()

/** 用户列表（只读） */
@Composable
fun AdminUsersScreen(
    onBack: () -> Unit,
    vm: AdminUsersViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(title = "用户", onBack = onBack) {
        SearchField(
            value = vm.keyword,
            onValueChange = vm::search,
            placeholder = "搜索昵称 / 登录名 / 邮箱",
            modifier = Modifier.padding(vertical = 8.dp)
        )
        Text(
            "共 ${vm.filtered.size} 位用户（只读）",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        when {
            vm.loading && vm.all.isEmpty() -> AdminLoading()
            vm.filtered.isEmpty() -> AdminEmpty("没有匹配的用户")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.filtered, key = { it.id }) { user ->
                    UserRow(user)
                    AdminDivider()
                }
            }
        }
    }
}

@Composable
private fun UserRow(user: User) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(url = user.avatar, name = user.nickname ?: user.username ?: "匿", size = 34.dp)
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    user.nickname ?: "（未设置昵称）",
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (user.type == "1") AdminBadge("管理员")
            }
            Text(
                listOfNotNull(user.username, user.email).joinToString(" · ").ifBlank { "—" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/** 聚合数据：见 AdminInsightScreen.kt（对标网页后台 /admin/insight） */
