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
import com.hanphone.blog.core.guestNickname
import com.hanphone.blog.core.saveGuest
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

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            TopAppBar(
                title = { Text("留言板") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "返回") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
                windowInsets = WindowInsets(0.dp)
            )
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
                                MessageRow(m)
                            }
                        }
                    }
                }
            }
        }
        ExtendedFloatingActionButton(
            onClick = { showDialog = true },
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
            icon = { Icon(Icons.Filled.Send, null) },
            text = { Text("写留言") }
        )
    }

    if (showDialog) {
        MessageDialog(
            onDismiss = { showDialog = false },
            onPosted = { vm.refresh() }
        )
    }
}

@Composable
private fun MessageRow(message: Message) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Avatar(url = message.avatar, name = message.nickname, size = 40.dp)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(message.nickname, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
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
            Text(message.content, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
private fun MessageDialog(onDismiss: () -> Unit, onPosted: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var nickname by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }

    val vm: MessageBoardViewModel = hiltViewModel()

    val guestNick by context.guestNickname.collectAsState(initial = "")
    LaunchedEffect(guestNick) { if (nickname.isEmpty()) nickname = guestNick }

    AlertDialog(
        onDismissRequest = { if (!sending) onDismiss() },
        title = { Text("写留言") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = nickname,
                    onValueChange = { nickname = it },
                    label = { Text("昵称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    label = { Text("想对博主说点什么…") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !sending && content.isNotBlank(),
                onClick = {
                    if (nickname.isBlank()) {
                        Toast.makeText(context, "昵称不能为空", Toast.LENGTH_SHORT).show()
                    } else {
                        sending = true
                        scope.launch { context.saveGuest(nickname.trim(), "") }
                        vm.postMessage(nickname.trim(), content.trim()) { message ->
                            sending = false
                            if (message != null) {
                                onDismiss()
                                onPosted()
                            } else {
                                Toast.makeText(context, "留言失败", Toast.LENGTH_SHORT).show()
                            }
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