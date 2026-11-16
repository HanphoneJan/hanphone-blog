package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.ui.components.Avatar

/** 友链审核/维护 */
@Composable
fun AdminFriendLinksScreen(
    onBack: () -> Unit,
    vm: AdminFriendLinksViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<FriendLink?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<FriendLink?>(null) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "友链管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } }
    ) {
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("还没有友链申请")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { link ->
                    FriendLinkRow(
                        link = link,
                        onEdit = { editing = link },
                        onTogglePublished = { vm.togglePublished(link) },
                        onToggleRecommend = { vm.toggleRecommend(link) },
                        onDelete = { pendingDelete = link }
                    )
                    AdminDivider()
                }
            }
        }
    }

    if (creating || editing != null) {
        FriendLinkDialog(
            initial = editing,
            onDismiss = { creating = false; editing = null },
            onSave = { link -> vm.save(link) { creating = false; editing = null } }
        )
    }

    pendingDelete?.let { link ->
        AdminConfirmDialog(
            title = "删除友链",
            text = "确定删除「${link.name}」？",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(link); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun FriendLinkRow(
    link: FriendLink,
    onEdit: () -> Unit,
    onTogglePublished: () -> Unit,
    onToggleRecommend: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(url = link.avatar, name = link.name, size = 34.dp)
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(link.name, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                link.url,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 3.dp)) {
                AdminBadge(
                    if (link.published == true) "已上线" else "待审核",
                    if (link.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                )
                if (link.recommend) AdminBadge("推荐", MaterialTheme.colorScheme.secondary)
            }
        }
        TextButton(onClick = onTogglePublished) { Text(if (link.published == true) "下线" else "上线") }
        TextButton(onClick = onToggleRecommend) { Text(if (link.recommend) "取消推荐" else "推荐") }
        IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, "编辑", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp)) }
        IconButton(onClick = onDelete) {
            Icon(Icons.Filled.Delete, "删除", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun FriendLinkDialog(
    initial: FriendLink?,
    onDismiss: () -> Unit,
    onSave: (FriendLink) -> Unit
) {
    var name by remember { mutableStateOf(initial?.name.orEmpty()) }
    var url by remember { mutableStateOf(initial?.url.orEmpty()) }
    var description by remember { mutableStateOf(initial?.description.orEmpty()) }
    var avatar by remember { mutableStateOf(initial?.avatar.orEmpty()) }
    var nickname by remember { mutableStateOf(initial?.nickname.orEmpty()) }
    var published by remember { mutableStateOf(initial?.published == true) }
    var recommend by remember { mutableStateOf(initial?.recommend ?: false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "新增友链" else "编辑友链") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                AdminField(name, { name = it }, "名称")
                AdminGap(8)
                AdminField(url, { url = it }, "链接", placeholder = "https://")
                AdminGap(8)
                AdminField(description, { description = it }, "简介", singleLine = false, minLines = 2)
                AdminGap(8)
                AdminField(avatar, { avatar = it }, "头像 URL", placeholder = "可留空")
                AdminGap(8)
                AdminField(nickname, { nickname = it }, "站长昵称", placeholder = "可留空")
                AdminGap(8)
                AdminSwitchRow("上线（审核通过）", published, { published = it })
                AdminSwitchRow("推荐", recommend, { recommend = it })
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(
                    (initial ?: FriendLink(id = 0)).copy(
                        name = name.trim(),
                        url = url.trim(),
                        description = description.trim(),
                        avatar = avatar.trim().ifBlank { null },
                        nickname = nickname.trim().ifBlank { null },
                        published = published,
                        recommend = recommend
                    )
                )
            }) { Text("保存") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}

/** 项目维护 */
@Composable
fun AdminProjectsScreen(
    onBack: () -> Unit,
    vm: AdminProjectsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<Project?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Project?>(null) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "项目管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } }
    ) {
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("还没有项目")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { project ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(project.title, style = MaterialTheme.typography.bodyLarge)
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.padding(top = 3.dp)
                            ) {
                                AdminBadge(typeLabel(project.type), MaterialTheme.colorScheme.secondary)
                                AdminBadge(
                                    if (project.published == true) "已发布" else "草稿",
                                    if (project.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                )
                                if (project.recommend) AdminBadge("推荐", MaterialTheme.colorScheme.tertiary)
                            }
                        }
                        TextButton(onClick = { vm.togglePublished(project) }) {
                            Text(if (project.published == true) "下线" else "发布")
                        }
                        TextButton(onClick = { vm.toggleRecommend(project) }) {
                            Text(if (project.recommend) "取消推荐" else "推荐")
                        }
                        IconButton(onClick = { editing = project }) {
                            Icon(Icons.Filled.Edit, "编辑", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                        }
                        IconButton(onClick = { pendingDelete = project }) {
                            Icon(Icons.Filled.Delete, "删除", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                        }
                    }
                    AdminDivider()
                }
            }
        }
    }

    if (creating || editing != null) {
        ProjectDialog(
            initial = editing,
            onDismiss = { creating = false; editing = null },
            onSave = { vm.save(it) { creating = false; editing = null } }
        )
    }

    pendingDelete?.let { project ->
        AdminConfirmDialog(
            title = "删除项目",
            text = "确定删除「${project.title}」？",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(project); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun ProjectDialog(
    initial: Project?,
    onDismiss: () -> Unit,
    onSave: (Project) -> Unit
) {
    var title by remember { mutableStateOf(initial?.title.orEmpty()) }
    var content by remember { mutableStateOf(initial?.content.orEmpty()) }
    var url by remember { mutableStateOf(initial?.url.orEmpty()) }
    var techs by remember { mutableStateOf(initial?.techs.orEmpty()) }
    var picUrl by remember { mutableStateOf(initial?.picUrl.orEmpty()) }
    var type by remember { mutableStateOf(initial?.type ?: 1) }
    var published by remember { mutableStateOf(initial?.published != false) }
    var recommend by remember { mutableStateOf(initial?.recommend ?: false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "新增项目" else "编辑项目") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                AdminField(title, { title = it }, "标题")
                AdminGap(8)
                AdminField(content, { content = it }, "简介", singleLine = false, minLines = 3)
                AdminGap(8)
                AdminField(url, { url = it }, "链接", placeholder = "https://")
                AdminGap(8)
                AdminField(techs, { techs = it }, "技术栈", placeholder = "逗号分隔，如：Vue3, Vite")
                AdminGap(8)
                AdminField(picUrl, { picUrl = it }, "封面 URL", placeholder = "可留空")
                AdminGap(10)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(1 to "完整项目", 2 to "工具箱", 3 to "小游戏", 4 to "小练习").forEach { (v, label) ->
                        AdminChip(label, type == v) { type = v }
                    }
                }
                AdminGap(8)
                AdminSwitchRow("发布", published, { published = it })
                AdminSwitchRow("推荐", recommend, { recommend = it })
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(
                    (initial ?: Project(id = 0)).copy(
                        title = title.trim(),
                        content = content,
                        url = url.trim().ifBlank { null },
                        techs = techs.trim(),
                        picUrl = picUrl.trim().ifBlank { null },
                        type = type,
                        published = published,
                        recommend = recommend
                    )
                )
            }) { Text("保存") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}

private fun typeLabel(type: Int): String = when (type) {
    1 -> "完整项目"
    2 -> "工具箱"
    3 -> "小游戏"
    4 -> "小练习"
    else -> "其他"
}
