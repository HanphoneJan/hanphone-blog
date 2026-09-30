package com.hanphone.blog.ui.chat

import android.view.inputmethod.InputMethodManager
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.chat.ChatConnectionState
import com.hanphone.blog.data.chat.ChatSocket
import com.hanphone.blog.data.chat.ChatUser
import com.hanphone.blog.data.chat.PrivateChatMessage
import com.hanphone.blog.data.chat.PublicChatMessage
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.util.resolveImageUrl
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.flow.drop

/**
 * 消息页（Hub）：公告 + 【聊天室 | 私信】双 Tab，对应 hanphone-chat 移动端。
 * 聊天室 = 公共房间；私信 = 与管理员（寒枫）的单聊（REST 历史 + socket 实时）。
 */
@Composable
fun ChatScreen(onLogin: () -> Unit) {
    val context = LocalContext.current
    val token by TokenStore.token.collectAsState()
    val userType by TokenStore.userType.collectAsState()
    val state by ChatSocket.state.collectAsState()
    val onlineCount by ChatSocket.onlineCount.collectAsState()
    var tab by remember { mutableIntStateOf(0) }

    // 连接/断连（token 变化即切换；单例已连接则忽略重复 connect）
    LaunchedEffect(token) {
        val t = token
        if (t != null) ChatSocket.connect(t) else ChatSocket.disconnect()
    }

    // socket 提示（服务端 notification 事件）；drop(1) 避免每次进入消息页重弹上次的通知
    LaunchedEffect(Unit) {
        ChatSocket.notice.drop(1).collect { n ->
            if (n != null) Toast.makeText(context, n, Toast.LENGTH_SHORT).show()
        }
    }

    // 消息页可见性：可见时收到私信不弹系统通知
    DisposableEffect(Unit) {
        ChatSocket.chatUiVisible = true
        onDispose { ChatSocket.chatUiVisible = false }
    }

    // 通知权限（Android 13+ 运行时请求，拒绝也不影响功能）
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            permLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    Column(Modifier.fillMaxSize()) {
        // ===== 头部 =====
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("消息", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.weight(1f))
            when {
                token == null -> Text("未登录", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                state == ChatConnectionState.CONNECTED -> Text("聊天室在线 ${onlineCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                state == ChatConnectionState.CONNECTING -> Text("连接中…", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                else -> Text("网络异常，重连中", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
            }
        }

        // ===== 公告横幅 =====
        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
            Text(
                "📢 欢迎来到云林有风聊天室：在聊天室 @寒枫 可召唤 AI 回复；私信可直接给博主留言。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
            )
        }

        // ===== Tab：聊天室 / 私信 =====
        TabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("聊天室") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("私信") })
        }

        when (tab) {
            0 -> PublicRoomContent(onLogin)
            1 -> if (userType == "1") AdminInboxContent(onLogin)
            else AdminThreadContent(onLogin, peerName = "寒枫（博主）", targetUserId = null)
        }
    }
}

/** 公共聊天室 */
@Composable
private fun PublicRoomContent(onLogin: () -> Unit) {
    val context = LocalContext.current
    val view = LocalView.current
    val token by TokenStore.token.collectAsState()
    val myUserId by TokenStore.userId.collectAsState()
    val myAvatar by TokenStore.avatar.collectAsState()
    val state by ChatSocket.state.collectAsState()
    val messages by ChatSocket.messages.collectAsState()
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.scrollToItem(messages.size - 1)
    }

    // 冷启动秒显：连接建立前先展示本地缓存历史（socket 数据到达后自然覆盖，不重复）
    LaunchedEffect(Unit) {
        if (ChatSocket.messages.value.isEmpty()) {
            val cached = ContentStore.readPublicChat()
            if (!cached.isNullOrEmpty()) ChatSocket.restoreMessages(cached)
        }
    }

    fun send() {
        if (input.isBlank()) return
        ChatSocket.send(input)
        input = ""
        hideKeyboard(context, view)
    }

    Column(Modifier.fillMaxSize()) {
        when {
            token == null -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("登录后可进入聊天室", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = onLogin, modifier = Modifier.padding(top = 16.dp)) { Text("去登录") }
                }
            }

            else -> {
                Box(Modifier.fillMaxWidth().weight(1f)) {
                    if (messages.isEmpty()) {
                        when (state) {
                            ChatConnectionState.CONNECTED -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text("还没有消息，来说第一句吧～", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                            }
                            ChatConnectionState.CONNECTING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    CircularProgressIndicator()
                                    Text(
                                        "连接中…",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(top = 12.dp)
                                    )
                                }
                            }
                            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("连接失败，请检查网络", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    TextButton(onClick = { ChatSocket.reconnect(token) }, modifier = Modifier.padding(top = 6.dp)) { Text("重新连接") }
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(messages, key = { it.tempId ?: "id_${it.id}" }) { msg ->
                                MessageBubble(msg.content, mine = msg.userId != null && msg.userId == myUserId, fromAi = msg.fromAi, nickname = msg.nickname, avatar = msg.avatar, timestamp = msg.timestamp, myAvatar = myAvatar)
                            }
                        }
                        // 断线不覆盖内容：顶部悬浮重连提示条
                        if (state != ChatConnectionState.CONNECTED) {
                            ReconnectBanner(state = state, onRetry = { ChatSocket.reconnect(token) }, modifier = Modifier.align(Alignment.TopCenter))
                        }
                    }
                }
                ChatInput(value = input, onChange = { input = it }, hint = "说点什么…（@寒枫 召唤 AI）", onSend = { send() })
            }
        }
    }
}

/** 私信会话：普通用户=与管理员单聊；管理员=与指定用户 */
@Composable
private fun AdminThreadContent(
    onLogin: () -> Unit,
    peerName: String,
    targetUserId: Long?,
    peerAvatar: String? = null,
    onBack: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val view = LocalView.current
    val token by TokenStore.token.collectAsState()
    val myUserId by TokenStore.userId.collectAsState()
    val myAvatar by TokenStore.avatar.collectAsState()
    val state by ChatSocket.state.collectAsState()
    val socketPrivates by ChatSocket.privateMessages.collectAsState()
    val lastPrivate by ChatSocket.lastPrivate.collectAsState()
    val repo = remember { BlogRepository() }

    var history by remember { mutableStateOf<List<PrivateChatMessage>>(emptyList()) }
    var historyError by remember { mutableStateOf<String?>(null) }
    var loadTick by remember { mutableIntStateOf(0) }
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // 本地缓存 key：普通用户与管理员=admin；管理员与某用户=u{userId}
    val convKey = remember(targetUserId) { if (targetUserId != null) "u$targetUserId" else "admin" }

    // 冷启动秒显：连接未就绪时先用本地缓存填充（REST 历史到达后覆盖）
    LaunchedEffect(convKey) {
        if (history.isEmpty()) {
            val cached = ContentStore.readPrivateChat(convKey)
            if (!cached.isNullOrEmpty()) {
                history = cached
                historyError = null
            }
        }
    }

    // 历史加载（连接就绪后拉取）
    LaunchedEffect(token, state, loadTick, targetUserId) {
        val t = token
        if (t != null && state == ChatConnectionState.CONNECTED) {
            try {
                val resp = if (targetUserId != null) repo.chatMessagesWithUser(t, targetUserId) else repo.adminMessages(t)
                if (resp.success) {
                    history = resp.messages
                    historyError = null
                    ContentStore.writePrivateChat(convKey, resp.messages) // 权威历史落盘
                } else historyError = "历史消息加载失败，点击重试"
            } catch (e: Exception) {
                historyError = e.message?.ifBlank { null } ?: "历史消息加载失败，点击重试"
            }
        }
    }
    // 实时合并（socket 事件追加）
    val all = remember(history, socketPrivates, lastPrivate, loadTick, myUserId, targetUserId) {
        val map = LinkedHashMap<Long, PrivateChatMessage>()
        history.forEach { map[it.id] = it }
        if (targetUserId != null) {
            val lp = lastPrivate
            if (lp != null && lp.id != 0L && (lp.senderId == targetUserId || lp.receiverId == targetUserId)) map[lp.id] = lp
        } else {
            socketPrivates.forEach { if (it.id != 0L) map[it.id] = it }
        }
        map.values.toList()
    }

    // 会话变化：滚动到底 + 节流落盘（5s 一次；id=0 的本地乐观气泡不写缓存）
    var lastPrivatePersist by remember { mutableStateOf(0L) }
    LaunchedEffect(all.size) {
        if (all.isNotEmpty()) {
            listState.scrollToItem(all.size - 1)
            val now = System.currentTimeMillis()
            if (now - lastPrivatePersist >= 5_000) {
                lastPrivatePersist = now
                ContentStore.writePrivateChat(convKey, all.filter { it.id != 0L })
            }
        }
    }

    fun send() {
        val content = input.trim()
        if (content.isEmpty() || token == null) return
        if (targetUserId != null) ChatSocket.sendAdminMessage(targetUserId, content)
        else ChatSocket.sendPrivate(content)
        history = history + PrivateChatMessage(
            id = 0L,
            senderId = myUserId ?: 0,
            receiverId = targetUserId ?: 1000,
            content = content,
            timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(Date()),
            isRead = true
        )
        input = ""
        hideKeyboard(context, view)
        loadTick++
    }

    Column(Modifier.fillMaxSize()) {
        when {
            token == null -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("登录后可给博主发私信", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = onLogin, modifier = Modifier.padding(top = 16.dp)) { Text("去登录") }
                }
            }

            else -> {
                // 会话标题
                Row(Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (onBack != null) IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "返回") }
                    Avatar(url = peerAvatar, name = peerName.firstOrNull()?.toString() ?: "友", size = 34.dp)
                    Text("  $peerName", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }
                Box(Modifier.fillMaxWidth().weight(1f)) {
                    if (all.isEmpty()) {
                        when (state) {
                            ChatConnectionState.CONNECTED -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        historyError ?: "还没有留言，打个招呼吧～",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = if (historyError != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline
                                    )
                                    if (historyError != null) {
                                        TextButton(onClick = { historyError = null; loadTick++ }, modifier = Modifier.padding(top = 6.dp)) { Text("重试") }
                                    }
                                }
                            }
                            ChatConnectionState.CONNECTING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    CircularProgressIndicator()
                                    Text(
                                        "连接中…",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(top = 12.dp)
                                    )
                                }
                            }
                            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("连接失败，请检查网络", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    TextButton(onClick = { ChatSocket.reconnect(token) }, modifier = Modifier.padding(top = 6.dp)) { Text("重新连接") }
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(all, key = { "p_${it.id}_${it.timestamp}" }) { m ->
                                val mine = m.senderId == myUserId
                                MessageBubble(m.content, mine = mine, fromAi = m.fromAi, nickname = if (m.fromAi) "AI" else (if (mine) "我" else peerName), avatar = if (m.fromAi || mine) null else peerAvatar, timestamp = m.timestamp, myAvatar = myAvatar)
                            }
                        }
                        // 断线不覆盖内容：顶部悬浮重连提示条
                        if (state != ChatConnectionState.CONNECTED) {
                            ReconnectBanner(state = state, onRetry = { ChatSocket.reconnect(token) }, modifier = Modifier.align(Alignment.TopCenter))
                        }
                    }
                }
                ChatInput(value = input, onChange = { input = it }, hint = if (targetUserId != null) "回复 $peerName…" else "给博主留言…", onSend = { send() })
            }
        }
    }
}

/** 管理员私信收件箱：全部用户列表，点入会话 */
@Composable
private fun AdminInboxContent(onLogin: () -> Unit) {
    val token by TokenStore.token.collectAsState()
    val userList by ChatSocket.userList.collectAsState()
    val repo = remember { BlogRepository() }
    var users by remember { mutableStateOf<List<ChatUser>>(emptyList()) }
    var open by remember { mutableStateOf<ChatUser?>(null) }

    // 冷启动秒显：REST 到达前先用本地缓存渲染列表（在线状态随后由 socket 覆盖）
    LaunchedEffect(Unit) {
        if (users.isEmpty()) {
            val cached = ContentStore.readChatUsers()
            if (!cached.isNullOrEmpty()) users = cached
        }
    }

    LaunchedEffect(token) {
        val t = token
        if (t != null) {
            kotlin.runCatching { repo.chatUsers(t) }.onSuccess {
                if (it.success) {
                    users = it.users
                    ContentStore.writeChatUsers(it.users)
                }
            }
        }
    }
    val merged = remember(users, userList) {
        val map = LinkedHashMap<Long, ChatUser>()
        users.forEach { map[it.id] = it }
        userList.forEach { u -> map[u.id] = map[u.id]?.copy(isOnline = true) ?: u }
        map.values.toList().sortedByDescending { it.isOnline }
    }

    when {
        token == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                Text("登录后可管理私信", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = onLogin, modifier = Modifier.padding(top = 16.dp)) { Text("去登录") }
            }
        }
        open != null -> AdminThreadContent(
            onLogin = onLogin,
            peerName = open!!.nickname.ifBlank { open!!.username },
            targetUserId = open!!.id,
            peerAvatar = open!!.avatar,
            onBack = { open = null }
        )
        else -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 6.dp)) {
            items(merged, key = { it.id }) { u ->
                Row(
                    Modifier.fillMaxWidth().clickable { open = u }.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(Modifier.size(40.dp)) {
                        Avatar(url = u.avatar, name = u.nickname.ifBlank { u.username }, size = 40.dp)
                        Box(
                            Modifier.align(Alignment.BottomEnd).size(12.dp)
                                .clip(CircleShape)
                                .background(if (u.isOnline) Color(0xFF27AE60) else Color(0xFFB0B7C3))
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(u.nickname.ifBlank { u.username }, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                        Text(if (u.isOnline) "在线" else "离线", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    }
                    Icon(Icons.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }
}

/** 紧凑输入栏：BasicTextField 胶囊（约 44dp，M3 TextField 默认 56dp 对聊天栏偏高） */
@Composable
private fun ChatInput(
    value: String,
    onChange: (String) -> Unit,
    hint: String,
    onSend: () -> Unit
) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Row(
            Modifier.weight(1f)
                .clip(RoundedCornerShape(22.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BasicTextField(
                value = value,
                onValueChange = onChange,
                modifier = Modifier.weight(1f).padding(start = 14.dp, end = 4.dp, top = 11.dp, bottom = 11.dp),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { onSend() }),
                decorationBox = { inner ->
                    Box {
                        if (value.isEmpty()) {
                            Text(
                                hint,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        inner()
                    }
                }
            )
        }
        IconButton(onClick = onSend, enabled = value.isNotBlank(), modifier = Modifier.padding(start = 2.dp).size(40.dp)) {
            Icon(
                Icons.Filled.Send,
                "发送",
                modifier = Modifier.size(20.dp),
                tint = if (value.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
            )
        }
    }
}

/** 断连/重连提示条：悬浮在消息列表顶部，不遮挡历史内容；整体可点击重试 */
@Composable
private fun ReconnectBanner(state: ChatConnectionState, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        shadowElevation = 2.dp,
        shape = RoundedCornerShape(bottomStart = 12.dp, bottomEnd = 12.dp),
        modifier = modifier.fillMaxWidth().clickable(onClick = onRetry)
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (state == ChatConnectionState.CONNECTING) {
                CircularProgressIndicator(Modifier.size(13.dp), strokeWidth = 2.dp)
                Text("正在连接…", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Text("网络异常，点击重试", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

/** 聊天气泡：我的靠右（primaryContainer，头像在右），他人靠左，AI 特殊色 */
@Composable
private fun MessageBubble(
    content: String,
    mine: Boolean,
    fromAi: Boolean,
    nickname: String,
    avatar: String?,
    timestamp: String,
    myAvatar: String? = null
) {
    val bg = when {
        fromAi -> MaterialTheme.colorScheme.tertiaryContainer
        mine -> MaterialTheme.colorScheme.primaryContainer
        else -> MaterialTheme.colorScheme.surfaceContainerHigh
    }
    val fg = when {
        fromAi -> MaterialTheme.colorScheme.onTertiaryContainer
        mine -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        if (!mine) {
            Avatar(url = if (fromAi) resolveImageUrl(avatar) else avatar, name = nickname, size = 32.dp, modifier = Modifier.padding(end = 8.dp))
        }
        Box(Modifier.weight(1f, fill = false)) {
            Column(
                horizontalAlignment = if (mine) Alignment.End else Alignment.Start,
                modifier = Modifier.widthIn(max = 300.dp).then(if (mine) Modifier.align(Alignment.CenterEnd) else Modifier.align(Alignment.CenterStart))
            ) {
                if (!mine) Text(nickname, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Surface(
                    shape = RoundedCornerShape(topStart = if (mine) 16.dp else 4.dp, topEnd = if (mine) 4.dp else 16.dp, bottomStart = 16.dp, bottomEnd = 16.dp),
                    color = bg,
                    contentColor = fg,
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text(content, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                }
                if (timestamp.isNotBlank()) {
                    Text(formatTime(timestamp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
        if (mine) {
            Avatar(url = resolveImageUrl(myAvatar), name = "我", size = 32.dp, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

private fun hideKeyboard(context: android.content.Context, view: android.view.View) {
    try {
        (context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE) as? InputMethodManager)
            ?.hideSoftInputFromWindow(view.windowToken, 0)
    } catch (_: Exception) { }
}

private fun formatTime(iso: String): String {
    if (iso.isBlank()) return ""
    return try {
        val p = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).parse(iso) ?: return ""
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(p)
    } catch (e: Exception) {
        try {
            val p = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(iso.replace("Z", "")) ?: return ""
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(p)
        } catch (e2: Exception) { "" }
    }
}