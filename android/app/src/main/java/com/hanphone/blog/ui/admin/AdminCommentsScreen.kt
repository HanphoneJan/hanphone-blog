package com.hanphone.blog.ui.admin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.util.formatDateTime
import android.widget.Toast

/**
 * 评论管理。
 *
 * ⚠️ 后端 `DELETE /comments/{id}` 目前**没有做鉴权**（只靠界面藏按钮），
 * 所以这里只对管理员开放入口；后续建议后端补上拦截。
 */
@Composable
fun AdminCommentsScreen(
    onBack: () -> Unit,
    vm: AdminCommentsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var pendingDelete by remember { mutableStateOf<Comment?>(null) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "评论管理",
        onBack = onBack,
        refreshable = vm,
    ) {
        Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            SearchField(
                value = vm.keyword,
                onValueChange = vm::search,
                placeholder = "搜索评论 / 昵称 / 文章",
                modifier = Modifier.weight(1f)
            )
        }
        Text(
            "共 ${vm.filtered.size} 条",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp)
        )
        AdminListBody(
            loading = vm.loading,
            list = vm.filtered,
            emptyText = "没有匹配的评论",
            key = { it.id }
        ) { comment ->
            CommentRow(comment) { pendingDelete = comment }
        }
    }

    pendingDelete?.let { comment ->
        AdminConfirmDialog(
            title = "删除评论",
            text = "「${comment.content.take(40)}」删除后不可恢复，确定继续？",
            confirmText = "删除",
            destructive = true,
            onConfirm = {
                vm.delete(comment)
                pendingDelete = null
            },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun CommentRow(comment: Comment, onDelete: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Column(Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    comment.nickname.ifBlank { "匿名" },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    // 昵称可能很长，不给 weight 会把后面的「博主/用户」徽标和时间挤成一条线
                    modifier = Modifier.weight(1f, fill = false)
                )
                AdminBadge(if (comment.adminComment) "博主" else "用户")
                Text(
                    formatDateTime(comment.createTime),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline,
                    maxLines = 1
                )
            }
            comment.blog?.title?.takeIf { it.isNotBlank() }?.let { title ->
                Text(
                    "《$title》",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
            Text(
                comment.content,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        IconButton(onClick = onDelete) {
            Icon(Icons.Filled.Delete, "删除", tint = MaterialTheme.colorScheme.error)
        }
    }
}
