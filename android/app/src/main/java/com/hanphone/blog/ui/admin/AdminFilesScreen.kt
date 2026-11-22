package com.hanphone.blog.ui.admin

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.api.FileEntry
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.ui.components.ToastMessage
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.util.buildFileServiceUrl
import com.hanphone.blog.util.formatDateTime
import java.util.Locale

/**
 * 后台「文件管理」：浏览 admin-file 的目录树、上传、新建文件夹、删除、打开单个文件。
 *
 * 对齐网页版 `web/src/app/admin/blog-files/page.tsx` 的能力，但用原生列表实现；
 * 只把「打开文件」交给通用 WebView（管理界面本身不用 WebView）。
 *
 * 服务端契约（admin-file/server.js）：
 * - `GET /files`：不带 namespace 返回根目录的命名空间列表，带则返回该目录 items；
 * - `POST /directory`：`{ name, parentNamespace }`；
 * - `DELETE /delete`：`{ name, namespace?, recursive }`，非空目录必须 recursive；
 * - `POST /upload/batch`：multipart 字段 files，namespace 走 query，单次最多 20 个。
 */
@Composable
fun AdminFilesScreen(
    onBack: () -> Unit,
    onOpenUrl: (url: String, title: String) -> Unit,
    vm: AdminFilesViewModel = hiltViewModel()
) {
    var creatingDir by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<FileEntry?>(null) }

    ToastMessage(vm.message, vm::consumeMessage)

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        vm.upload(uris)
    }

    // 系统返回：子目录先回上一级，根目录才退出页面
    BackHandler { if (!vm.up()) onBack() }

    AdminScaffold(
        title = "文件管理",
        onBack = onBack,
        actions = {
            TextButton(onClick = { picker.launch(arrayOf("*/*")) }, enabled = !vm.uploading) {
                Text(if (vm.uploading) "上传中…" else "上传")
            }
            TextButton(onClick = { creatingDir = true }) { Text("新建文件夹") }
        },
        refreshable = vm
    ) {
        FileBreadcrumb(path = vm.path, onNavigate = vm::open)
        if (vm.uploading) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                color = MaterialTheme.colorScheme.primary
            )
        }

        val list = vm.items
        val error = vm.error
        when {
            vm.loading && list.isEmpty() -> RowListSkeleton(leading = 22.dp, contentPadding = 4.dp)
            error != null && list.isEmpty() -> ErrorBox(error, vm::refresh)
            list.isEmpty() -> EmptyBox("这个目录还是空的")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(list, key = { it.name }) { entry ->
                    FileRow(
                        entry = entry,
                        onOpen = {
                            if (entry.isDirectory) {
                                vm.open(joinPath(vm.path, entry.name))
                            } else {
                                onOpenUrl(buildFileServiceUrl(vm.path, entry.name), entry.name)
                            }
                        },
                        onDelete = { pendingDelete = entry }
                    )
                    AdminDivider()
                }
            }
        }
    }

    if (creatingDir) {
        CreateDirectoryDialog(
            vm = vm,
            onDismiss = { creatingDir = false },
            onCreated = { creatingDir = false }
        )
    }

    pendingDelete?.let { entry ->
        val atRoot = vm.path.isNullOrBlank()
        AdminConfirmDialog(
            title = if (entry.isDirectory) "删除文件夹" else "删除文件",
            text = when {
                !entry.isDirectory -> "确定删除「${entry.name}」？删除后不可恢复。"
                atRoot -> "「${entry.name}」是一个根级命名空间，删除会清空其中全部内容（所有附件/文档），且不可恢复。确定继续？"
                else -> "将删除「${entry.name}」及其中全部内容，且不可恢复。确定继续？"
            },
            confirmText = "删除",
            destructive = true,
            onConfirm = {
                vm.delete(entry)
                pendingDelete = null
            },
            onDismiss = { pendingDelete = null }
        )
    }
}

/** 当前目录的路径拼接（根目录进入第一层就是名字本身） */
private fun joinPath(path: String?, name: String): String =
    if (path.isNullOrBlank()) name else "$path/$name"

/** 面包屑：根目录 / blog / docs，点任意一级跳回；横向可滚 */
@Composable
private fun FileBreadcrumb(path: String?, onNavigate: (String?) -> Unit) {
    val crumbs = remember(path) {
        val list = mutableListOf<Pair<String?, String>>(null to "根目录")
        if (!path.isNullOrBlank()) {
            var acc = ""
            path.split('/').filter { it.isNotBlank() }.forEach { segment ->
                acc = if (acc.isEmpty()) segment else "$acc/$segment"
                list += acc to segment
            }
        }
        list
    }
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        crumbs.forEachIndexed { index, (target, label) ->
            if (index > 0) {
                Text("/", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            }
            val isLast = index == crumbs.lastIndex
            Text(
                label,
                style = MaterialTheme.typography.labelLarge,
                color = if (isLast) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.primary,
                maxLines = 1,
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable(enabled = !isLast) { onNavigate(target) }
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            )
        }
    }
}

/** 一行文件/目录：图标 + 名称 + 副标题 + 「⋮」菜单（行尾只留一个固定宽度操作位） */
@Composable
private fun FileRow(
    entry: FileEntry,
    onOpen: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            if (entry.isDirectory) Icons.Filled.Folder else Icons.Filled.Description,
            contentDescription = null,
            tint = if (entry.isDirectory) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            modifier = Modifier.size(22.dp)
        )
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(
                entry.name,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                fileSubtitle(entry),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        AdminRowMenu(
            listOf(
                AdminMenuAction(label = "打开", onClick = onOpen),
                AdminMenuAction(label = "删除", onClick = onDelete, destructive = true)
            )
        )
    }
}

private fun fileSubtitle(entry: FileEntry): String {
    if (entry.isDirectory) return "文件夹"
    val time = formatDateTime(entry.mtime)
    val size = formatFileSize(entry.size)
    return if (time.isBlank()) size else "$size · $time"
}

/** 与网页版一致的大小格式（Bytes / KB / MB / GB，两位小数） */
private fun formatFileSize(bytes: Long): String {
    if (bytes <= 0L) return "0 Bytes"
    val k = 1024.0
    if (bytes < 1024L) return "$bytes Bytes"
    val i = (Math.log(bytes.toDouble()) / Math.log(k)).toInt().coerceIn(1, 3)
    val value = bytes / Math.pow(k, i.toDouble())
    return String.format(Locale.US, "%.2f %s", value, listOf("", "KB", "MB", "GB")[i])
}

/** 新建文件夹：只有一个名称字段，成功后父级刷新 */
@Composable
private fun CreateDirectoryDialog(
    vm: AdminFilesViewModel,
    onDismiss: () -> Unit,
    onCreated: () -> Unit
) {
    val toast = rememberToast()
    var name by remember { mutableStateOf("") }

    AdminFormDialog(
        title = "新建文件夹",
        onDismiss = onDismiss,
        saving = vm.creating,
        enabled = name.isNotBlank(),
        saveText = "创建",
        onSave = {
            val trimmed = name.trim()
            when {
                trimmed.isBlank() -> toast("请输入文件夹名称")
                trimmed.contains('/') || trimmed.contains('\\') -> toast("名称不能包含 /")
                else -> vm.createDirectory(trimmed) { onCreated() }
            }
        }
    ) {
        AdminField(name, { name = it }, "文件夹名称", placeholder = "例如：essay-2026")
        Text(
            if (vm.path.isNullOrBlank()) "将创建在根目录下" else "将创建在 ${vm.path} 下",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
