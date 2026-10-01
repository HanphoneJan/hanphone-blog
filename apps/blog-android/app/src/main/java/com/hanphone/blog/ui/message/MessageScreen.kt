package com.hanphone.blog.ui.message

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.core.guestAvatar
import com.hanphone.blog.core.saveGuest
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.repo.MessageRepository
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.util.formatDateTime
import kotlinx.coroutines.launch

/** 留言板（独立页）：留言列表 + 快速留言 FAB */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageScreen(onBack: () -> Unit) {
    val vm: MessageBoardViewModel = hiltViewModel()
    val context = LocalContext.current

    val items = vm.items
    var showDialog by remember { mutableStateOf(false) }
    var replyTarget by remember { mutableStateOf<Message?>(null) }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppBackBar(title = "留言板", onBack = onBack)
            Box(Modifier.weight(1f)) {
                PullToRefreshBox(
                    isRefreshing = vm.refreshing,
                    onRefresh = { vm.refresh(fromPull = true) },
                    modifier = Modifier.fillMaxSize()
                ) {
                    when {
                        vm.loading && items.isEmpty() -> RowListSkeleton(Modifier.padding(top = 8.dp), count = 5)
                        vm.error != null && items.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                        items.isEmpty() -> EmptyBox("还没有留言，来踩一脚吧～")
                        else -> LazyColumn(
                            Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(items, key = { it.id }) { m ->
                                MessageRow(
                                    message = m,
                                    onReply = { replyTarget = m; showDialog = true }
                                )
                            }
                        }
                    }
                }
            }
        }
        ExtendedFloatingActionButton(
            onClick = { replyTarget = null; showDialog = true },
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
            icon = { Icon(Icons.Filled.Send, null) },
            text = { Text("写留言") }
        )
    }

    if (showDialog) {
        MessageDialog(
            replyTo = replyTarget,
            onDismiss = { showDialog = false },
            onPosted = { vm.refresh() }
        )
    }
}

@Composable
private fun MessageRow(message: Message, onReply: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Avatar(url = message.avatar, name = message.nickname, size = 40.dp)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(message.nickname, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                // 回复 @父留言（后端内嵌 parentMessage）
                message.parentMessage?.let { parent ->
                    Text(
                        "回复 @${parent.nickname}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                if (message.adminMessage) {
                    Surface(
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    ) {
                        Text("站长", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp))
                    }
                }
                Spacer(Modifier.weight(1f))
                Text(formatDateTime(message.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
            // 点击内容回复（替代独立回复按钮）；内容可长按选中复制
            SelectionContainer {
                Text(
                    message.content,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.pointerInput(message.id) {
                        detectTapGestures { onReply() }
                    }
                )
            }
        }
    }
}

@Composable
private fun MessageDialog(replyTo: Message?, onDismiss: () -> Unit, onPosted: () -> Unit) {
    val context = LocalContext.current

    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }

    val vm: MessageBoardViewModel = hiltViewModel()
    // 对齐网页版：不填昵称——作者取登录昵称；未登录固定「匿名用户」；头像优先登录/设置头像
    val nickname by TokenStore.nickname.collectAsState()
    val avatar by TokenStore.avatar.collectAsState()
    val guestAvatarUrl by context.guestAvatar.collectAsState(initial = null)

    AlertDialog(
        onDismissRequest = { if (!sending) onDismiss() },
        title = { Text(if (replyTo != null) "回复 @${replyTo!!.nickname}" else "写留言") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    label = { Text(if (replyTo != null) "回复内容…" else "想对博主说点什么…") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    if (nickname != null) "以「$nickname」身份留言" else "将以「匿名用户」身份留言",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !sending && content.isNotBlank(),
                onClick = {
                    sending = true
                    vm.postMessage(
                        nickname ?: "匿名用户",
                        content.trim(),
                        avatar ?: guestAvatarUrl ?: "",
                        replyTo?.id ?: -1L
                    ) { message ->
                        sending = false
                        if (message != null) {
                            onDismiss()
                            onPosted()
                        } else {
                            Toast.makeText(context, "留言失败", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            ) { Text(if (sending) "发送中…" else "发送") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !sending) { Text("取消") }
        }
    )
}