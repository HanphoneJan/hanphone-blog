package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.TagBlogCount
import com.hanphone.blog.data.model.Type

/** 标签管理：列表（含关联文章数）+ 新增/改名/删除 */
@Composable
fun AdminTagsScreen(
    onBack: () -> Unit,
    vm: AdminTagsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<TagBlogCount?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<TagBlogCount?>(null) }
    var name by remember { mutableStateOf("") }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "标签管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true; name = "" }) { Text("新增") } }
    ) {
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("还没有标签")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { tag ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(tag.name, style = MaterialTheme.typography.bodyLarge)
                            Text(
                                "${tag.blogsNumber} 篇文章",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        IconButton(onClick = { editing = tag; name = tag.name }) {
                            Icon(Icons.Filled.Edit, "编辑", modifier = Modifier.size(18.dp))
                        }
                        IconButton(onClick = { pendingDelete = tag }) {
                            Icon(
                                Icons.Filled.Delete,
                                "删除",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    AdminDivider()
                }
            }
        }
    }

    if (creating || editing != null) {
        AlertDialog(
            onDismissRequest = { creating = false; editing = null },
            title = { Text(if (creating) "新增标签" else "重命名标签") },
            text = {
                Column {
                    AdminGap(4)
                    AdminField(name, { name = it }, "标签名", placeholder = "例如：Kotlin")
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val id = editing?.id
                    vm.save(id, name) { creating = false; editing = null }
                }) { Text("保存") }
            },
            dismissButton = { TextButton(onClick = { creating = false; editing = null }) { Text("取消") } }
        )
    }

    pendingDelete?.let { tag ->
        AdminConfirmDialog(
            title = "删除标签",
            text = "确定删除「${tag.name}」？仍有关联文章时后端会拒绝删除。",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(tag); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

/** 分类管理：名称 + 分类图（上传后作为该分类下文章的默认封面） */
@Composable
fun AdminTypesScreen(
    onBack: () -> Unit,
    vm: AdminTypesViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<Type?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Type?>(null) }
    var name by remember { mutableStateOf("") }
    var picUrl by remember { mutableStateOf("") }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "分类管理",
        onBack = onBack,
        actions = {
            TextButton(onClick = { creating = true; name = ""; picUrl = "" }) { Text("新增") }
        }
    ) {
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("还没有分类")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { type ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(type.name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                        if (!type.picUrl.isNullOrBlank()) {
                            AdminBadge("有图", MaterialTheme.colorScheme.secondary)
                        }
                        IconButton(onClick = { editing = type; name = type.name; picUrl = type.picUrl.orEmpty() }) {
                            Icon(Icons.Filled.Edit, "编辑", modifier = Modifier.size(18.dp))
                        }
                        IconButton(onClick = { pendingDelete = type }) {
                            Icon(
                                Icons.Filled.Delete,
                                "删除",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    AdminDivider()
                }
            }
        }
    }

    if (creating || editing != null) {
        AlertDialog(
            onDismissRequest = { creating = false; editing = null },
            title = { Text(if (creating) "新增分类" else "编辑分类") },
            text = {
                Column {
                    AdminGap(4)
                    AdminField(name, { name = it }, "分类名")
                    AdminGap(8)
                    AdminField(
                        picUrl,
                        { picUrl = it },
                        "分类图 URL",
                        placeholder = "可留空；也可直接粘贴图片地址"
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val id = editing?.id
                    vm.save(id, name, picUrl) { creating = false; editing = null }
                }) { Text("保存") }
            },
            dismissButton = { TextButton(onClick = { creating = false; editing = null }) { Text("取消") } }
        )
    }

    pendingDelete?.let { type ->
        AdminConfirmDialog(
            title = "删除分类",
            text = "确定删除「${type.name}」？分类图会一并从服务器删除。",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(type); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}
