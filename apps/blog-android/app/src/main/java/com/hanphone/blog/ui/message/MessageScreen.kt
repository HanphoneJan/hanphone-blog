package com.hanphone.blog.ui.message

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.core.draftFlow
import com.hanphone.blog.core.saveDraft
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.CommentInputBar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.ui.components.hideKeyboard
import com.hanphone.blog.util.formatDateTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** 留言板（独立页）：留言列表 + 底部留言输入条（草稿持久化） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageScreen(onBack: () -> Unit) {
    val vm: MessageBoardViewModel = hiltViewModel()
    val context = LocalContext.current
    val view = LocalView.current
    val scope = rememberCoroutineScope()

    val items = vm.items
    var replyTarget by remember { mutableStateOf<Message?>(null) }

    // ===== 底部输入（草稿持久化到 DataStore，防误退丢失）=====
    val draftKind = "message_comment"
    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { content = context.draftFlow(draftKind).first() }
    LaunchedEffect(content) {
        delay(400)
        context.saveDraft(draftKind, content)
    }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun sendMessage() {
        if (sending) return
        val text = content.trim()
        if (text.isEmpty()) return
        sending = true
        vm.postMessage(
            TokenStore.nickname.value ?: "匿名用户",
            text,
            TokenStore.avatar.value ?: "",
            replyTarget?.id ?: -1L
        ) { message ->
            sending = false
            if (message != null) {
                content = ""
                replyTarget = null
                scope.launch { context.saveDraft(draftKind, "") }
                hideKeyboard(context, view)
                vm.refresh()
            } else {
                toast("留言失败")
            }
        }
    }

    val nickname by TokenStore.nickname.collectAsState()
    val token by TokenStore.token.collectAsState()

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "留言板", onBack = onBack)
        Column(Modifier.weight(1f).fillMaxWidth()) {
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
                                onReply = { replyTarget = m }
                            )
                        }
                    }
                }
            }
        }
        CommentInputBar(
            value = content,
            onValueChange = { content = it },
            onSend = { sendMessage() },
            sendEnabled = content.isNotBlank() && !sending,
            placeholder = if (replyTarget != null) "回复 @${replyTarget!!.nickname}…" else "想对博主说点什么…",
            replyName = replyTarget?.nickname,
            onCancelReply = { replyTarget = null },
            subtitle = if (token == null) "将以「匿名用户」身份留言" else null
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