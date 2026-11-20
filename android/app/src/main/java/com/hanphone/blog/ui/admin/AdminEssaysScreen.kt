package com.hanphone.blog.ui.admin

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayFileUrl
import com.hanphone.blog.util.formatDate
import android.widget.Toast
import com.hanphone.blog.ui.components.ToastMessage

/** 随笔管理列表：含未发布、发布/推荐切换、删除、进入编辑 */
@Composable
fun AdminEssaysScreen(
    onBack: () -> Unit,
    onCreate: () -> Unit,
    onEdit: (Essay) -> Unit,
    vm: AdminEssaysViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var pendingDelete by remember { mutableStateOf<Essay?>(null) }

    ToastMessage(vm.message, vm::consumeMessage)
    // 从编辑页返回时列表 VM 不会被重建，靠脏标记触发刷新
    LifecycleResumeEffect(Unit) {
        if (AdminEditBus.essayDirty) {
            AdminEditBus.essayDirty = false
            vm.refresh()
        }
        onPauseOrDispose {}
    }

    AdminScaffold(
        title = "随笔管理",
        onBack = onBack,
        actions = { TextButton(onClick = vm::refresh) { Text("刷新") } },
        refreshable = vm,
        floating = {
            ExtendedFloatingActionButton(
                onClick = onCreate,
                icon = { Icon(Icons.Filled.Add, null) },
                text = { Text("新建") }
            )
        }
    ) {
        AdminListFrame(vm.loading, vm.items.isEmpty(), "还没有随笔，点右下角新建") {
            LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { essay ->
                    EssayAdminRow(
                        essay = essay,
                        onEdit = { AdminEditBus.essay = essay; onEdit(essay) },
                        onTogglePublish = { vm.togglePublished(essay) },
                        onToggleRecommend = { vm.toggleRecommend(essay) },
                        onDelete = { pendingDelete = essay }
                    )
                    AdminDivider()
                }
                item {
                    if (vm.hasMore) {
                        Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                            if (vm.loadingMore) {
                                CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                            } else {
                                TextButton(onClick = vm::loadMore) { Text("加载更多") }
                            }
                        }
                    }
                }
            }
        }
    }

    pendingDelete?.let { essay ->
        AdminConfirmDialog(
            title = "删除随笔",
            text = "「${essay.title}」的附件会一并从服务器删除，确定继续？",
            confirmText = "删除",
            destructive = true,
            onConfirm = {
                vm.delete(essay)
                pendingDelete = null
            },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun EssayAdminRow(
    essay: Essay,
    onEdit: () -> Unit,
    onTogglePublish: () -> Unit,
    onToggleRecommend: () -> Unit,
    onDelete: () -> Unit
) {
    var menu by remember { mutableStateOf(false) }
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onEdit).padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    essay.title.ifBlank { "（无标题）" },
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (essay.recommend) {
                    AdminStarMark(Modifier.padding(start = 6.dp, top = 2.dp))
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                AdminBadge(
                    if (essay.published == true) "已发布" else "草稿",
                    if (essay.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                )
                Text(
                    "${formatDate(essay.createTime)} · ${essay.essayFileUrls.size} 个附件",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Box {
            IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, "更多") }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text("编辑") }, onClick = { menu = false; onEdit() })
                DropdownMenuItem(
                    text = { Text(if (essay.published == true) "取消发布" else "发布") },
                    onClick = { menu = false; onTogglePublish() }
                )
                DropdownMenuItem(
                    text = { Text(if (essay.recommend) "取消推荐" else "推荐") },
                    onClick = { menu = false; onToggleRecommend() }
                )
                DropdownMenuItem(text = { Text("删除") }, onClick = { menu = false; onDelete() })
            }
        }
    }
}

/**
 * 随笔编辑页。
 *
 * 附件顺序即展示顺序：九宫格按上传顺序排，这里保持追加语义（不提供拖拽排序，
 * 需要调顺序时删掉重传）。
 */
@Composable
fun AdminEssayEditScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    vm: AdminEssayEditViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val mediaPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(9)
    ) { uris -> if (uris.isNotEmpty()) vm.addAttachments(uris) }

    val docPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris -> if (uris.isNotEmpty()) vm.addAttachments(uris) }

    ToastMessage(vm.message, vm::consumeMessage)
    LaunchedEffect(vm.saved) {
        if (vm.saved) onSaved()
    }

    AdminScaffold(
        title = if (vm.isNew) "新建随笔" else "编辑随笔",
        onBack = onBack,
        actions = {
            TextButton(onClick = vm::save, enabled = !vm.saving) {
                if (vm.saving) {
                    CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("保存")
                }
            }
        }
    ) {
        if (vm.loading) {
            AdminLoading()
            return@AdminScaffold
        }
        Column(Modifier.fillMaxWidth()) {
            AdminField(
                value = vm.title,
                onValueChange = vm::updateTitle,
                label = "标题",
                placeholder = "随笔标题"
            )
            AdminGap(8)
            AdminField(
                value = vm.content,
                onValueChange = vm::updateContent,
                label = "内容",
                singleLine = false,
                minLines = 8,
                placeholder = "写点什么…"
            )
            AdminGap(12)
            AdminSectionTitle("附件", "${vm.files.size} 个")
            if (vm.files.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    itemsIndexed(vm.files) { index, file ->
                        AttachmentThumb(file) { vm.removeAttachment(index) }
                    }
                }
                AdminGap(8)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = {
                    mediaPicker.launch(
                        PickVisualMediaRequest(
                            ActivityResultContracts.PickVisualMedia.ImageAndVideo
                        )
                    )
                }) { Text("添加图片/视频") }
                TextButton(onClick = {
                    docPicker.launch(arrayOf("text/*", "application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                }) { Text("添加文件") }
            }
            vm.uploadingLabel?.let {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                    Text(
                        " $it",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            AdminGap(8)
            Text(
                "图片会自动压缩到长边 1600 / JPEG 0.85 后上传；视频保留原片（服务端异步转 HLS）。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            AdminGap(24)
        }
    }
}

@Composable
private fun AttachmentThumb(file: EssayFileUrl, onRemove: () -> Unit) {
    Box(Modifier.size(84.dp)) {
        val isVideo = file.urlType.equals("video", ignoreCase = true)
        AsyncImage(
            model = file.displayUrl(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(84.dp).clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        )
        if (isVideo) {
            Text(
                "视频",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .background(Color.Black.copy(alpha = 0.55f))
                    .padding(horizontal = 4.dp, vertical = 1.dp)
            )
        }
        Box(
            Modifier.align(Alignment.TopEnd).size(20.dp)
                .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(bottomStart = 8.dp))
                .clickable(onClick = onRemove),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Close, "移除", tint = Color.White, modifier = Modifier.size(13.dp))
        }
    }
}
