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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.util.formatDate

/** 博客列表管理 */
@Composable
fun AdminBlogsScreen(
    onBack: () -> Unit,
    onCreate: () -> Unit,
    onEdit: (Blog) -> Unit,
    vm: AdminBlogsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var pendingDelete by remember { mutableStateOf<Blog?>(null) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }
    LifecycleResumeEffect(Unit) {
        if (AdminEditBus.blogDirty) {
            AdminEditBus.blogDirty = false
            vm.refresh()
        }
        onPauseOrDispose {}
    }

    AdminScaffold(
        title = "博客管理",
        onBack = onBack,
        floating = {
            ExtendedFloatingActionButton(
                onClick = onCreate,
                icon = { Icon(Icons.Filled.Add, null) },
                text = { Text("新建") }
            )
        }
    ) {
        SearchField(
            value = vm.keyword,
            onValueChange = vm::search,
            placeholder = "按标题搜索",
            modifier = Modifier.padding(vertical = 8.dp)
        )
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("没有匹配的博客")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { blog ->
                    BlogAdminRow(
                        blog = blog,
                        onEdit = { AdminEditBus.blog = blog; onEdit(blog) },
                        onTogglePublish = { vm.togglePublished(blog) },
                        onToggleRecommend = { vm.toggleRecommend(blog) },
                        onDelete = { pendingDelete = blog }
                    )
                    AdminDivider()
                }
                item {
                    if (vm.page < vm.totalPages) {
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

    pendingDelete?.let { blog ->
        AdminConfirmDialog(
            title = "删除博客",
            text = "「${blog.title}」删除后不可恢复（封面图会一并从服务器删除），确定继续？",
            confirmText = "删除",
            destructive = true,
            onConfirm = {
                vm.delete(blog)
                pendingDelete = null
            },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun BlogAdminRow(
    blog: Blog,
    onEdit: () -> Unit,
    onTogglePublish: () -> Unit,
    onToggleRecommend: () -> Unit,
    onDelete: () -> Unit
) {
    var menu by remember { mutableStateOf(false) }
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            Modifier
                .weight(1f)
                .padding(end = 6.dp)
        ) {
            Text(
                blog.title.ifBlank { "（无标题）" },
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                AdminBadge(
                    if (blog.published) "已发布" else "草稿",
                    if (blog.published) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                )
                if (blog.recommend) AdminBadge("推荐", Color(0xFFE8A33D))
                blog.type?.name?.let { AdminBadge(it, MaterialTheme.colorScheme.secondary) }
                Text(
                    "${formatDate(blog.createTime)} · ${blog.views} 阅读",
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
                    text = { Text(if (blog.published) "取消发布" else "发布") },
                    onClick = { menu = false; onTogglePublish() }
                )
                DropdownMenuItem(
                    text = { Text(if (blog.recommend) "取消推荐" else "推荐") },
                    onClick = { menu = false; onToggleRecommend() }
                )
                DropdownMenuItem(text = { Text("删除") }, onClick = { menu = false; onDelete() })
            }
        }
    }
}
