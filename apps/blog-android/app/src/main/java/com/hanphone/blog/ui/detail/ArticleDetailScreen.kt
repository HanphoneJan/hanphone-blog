package com.hanphone.blog.ui.detail

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.hanphone.blog.core.guestAvatar
import com.hanphone.blog.core.guestEmail
import com.hanphone.blog.core.guestNickname
import com.hanphone.blog.core.saveGuest
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.ui.MarkdownBlockContent
import com.hanphone.blog.ui.extractTocHeadings
import com.hanphone.blog.ui.splitMarkdownBlocks
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.BottomActionItem
import com.hanphone.blog.ui.components.DetailSkeleton
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.util.formatDate
import com.hanphone.blog.util.formatDateTime
import com.hanphone.blog.util.resolveImageUrl
import kotlinx.coroutines.launch

/** 文章详情：正文 + 底部操作栏（点赞/评论/分享）+ 评论区 + 匿名发评论 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArticleDetailScreen(blogId: Long, onBack: () -> Unit, onLogin: () -> Unit) {
    val context = LocalContext.current
    val vm: ArticleDetailViewModel = hiltViewModel()
    val listState = rememberLazyListState()
    var showToc by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // 阅读进度（按已滚动条目占比近似，对齐 web 版进度条）
    val readingProgress by remember { derivedStateOf {
        val info = listState.layoutInfo
        val total = info.totalItemsCount
        if (total <= 1) 0f
        else ((listState.firstVisibleItemIndex + 1).toFloat() / total).coerceIn(0f, 1f)
    } }
    val blog = vm.blog
    val comments = vm.comments
    val loading = vm.loading
    val error = vm.error
    val liked = vm.liked
    val likesCount = vm.likesCount

    var showCommentDialog by remember { mutableStateOf(false) }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun share() {
        val url = "https://hanphone.cn/blog/$blogId"
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, url)
        }
        context.startActivity(Intent.createChooser(send, "分享到"))
    }

    fun doLike() {
        val uid = TokenStore.userId.value
        if (uid == null) {
            toast("请先登录")
            onLogin()
            return
        }
        vm.toggleLike(uid)
    }

    Column(Modifier.fillMaxSize()) {
        // 紧凑头部：44dp 行（Scaffold 的 innerPadding 已含状态栏高度，这里无需再加）
        Row(
            Modifier
                .fillMaxWidth()
                .height(44.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack, modifier = Modifier.size(40.dp)) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "返回")
            }
        }

        // 阅读进度条（对齐 web 版 ReadingProgress）
        LinearProgressIndicator(
            progress = { readingProgress },
            modifier = Modifier.fillMaxWidth().height(2.dp),
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )

        when {
            loading && blog == null -> Box(Modifier.weight(1f).fillMaxWidth()) { DetailSkeleton() }
            error != null && blog == null -> Box(Modifier.weight(1f).fillMaxWidth()) { ErrorBox(error!!, onRetry = { vm.retry() }) }
            blog != null -> {
                // 目录数据（有标题才显示入口）
                val blocks = remember(blog!!.content) { splitMarkdownBlocks(blog!!.content) }
                val headings = remember(blocks) { extractTocHeadings(blocks) }

                Box(Modifier.weight(1f).fillMaxWidth()) {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    item { DetailHeader(blog!!) }
                    itemsIndexed(blocks) { index, block ->
                        MarkdownBlockContent(
                            block = block,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
                        )
                        // 每块之间留少量间距（标题块自身由 typography 行距承担）
                        if (index < blocks.lastIndex) Spacer(Modifier.height(6.dp))
                    }
                    item {
                        HorizontalDivider(
                            Modifier.padding(horizontal = 16.dp, vertical = 20.dp),
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        )
                    }
                    item {
                        Text(
                            "评论（${comments.size}）",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )
                    }
                    if (comments.isEmpty()) {
                        item {
                            Text(
                                "还没有评论，来做第一个吧～",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                            )
                        }
                    } else {
                        items(comments, key = { it.id }) { comment ->
                            CommentRow(comment, Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                        }
                    }
                }

                // 目录悬浮按钮（对齐 web 版目录导航）
                if (headings.isNotEmpty()) {
                    SmallFloatingActionButton(
                        onClick = { showToc = true },
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(end = 16.dp, bottom = 16.dp)
                    ) {
                        Icon(Icons.Filled.List, contentDescription = "目录")
                    }
                }
                }
            }
        }

        if (blog != null) {
            Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 8.dp) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BottomActionItem(
                        icon = if (liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        label = "点赞 $likesCount",
                        tint = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        onClick = { doLike() },
                        modifier = Modifier.weight(1f)
                    )
                    BottomActionItem(
                        icon = Icons.Filled.Email,
                        label = "评论",
                        onClick = { showCommentDialog = true },
                        modifier = Modifier.weight(1f)
                    )
                    BottomActionItem(
                        icon = Icons.Filled.Share,
                        label = "分享",
                        onClick = { share() },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }

    if (showCommentDialog) {
        CommentDialog(vm = vm, onDismiss = { showCommentDialog = false }) { newComment ->
            vm.addComment(newComment)
        }
    }

    // 目录面板（对齐 web 版 MobileToc：点击标题滚动到对应位置）
    if (showToc) {
        val toc = remember(blog?.content) {
            extractTocHeadings(splitMarkdownBlocks(blog?.content ?: ""))
        }
        ModalBottomSheet(onDismissRequest = { showToc = false }) {
            Text(
                "目录",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
            )
            LazyColumn(Modifier.padding(bottom = 24.dp)) {
                items(toc) { h ->
                    Text(
                        text = "  ".repeat(h.level - 1) + h.text,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (h.level == 1) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                scope.launch { listState.animateScrollToItem(h.blockIndex + 1) } // +1 跳过头部 item
                                showToc = false
                            }
                            .padding(horizontal = 20.dp, vertical = 10.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun DetailHeader(blog: Blog) {
    Column(Modifier.fillMaxWidth().padding(16.dp)) {
        Text(blog.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            blog.type?.let { type ->
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ) {
                    Text(type.name, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            Text(formatDate(blog.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.weight(1f))
            Text("${blog.views} 次阅读", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        blog.user?.nickname?.let {
            Text("作者 · $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
        }

        val cover = blog.firstPicture?.let { resolveImageUrl(it) }
        if (cover != null) {
            AsyncImage(
                model = cover,
                contentDescription = blog.title,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp).clip(RoundedCornerShape(10.dp)),
                contentScale = ContentScale.FillWidth
            )
        }
    }
}

@Composable
private fun CommentRow(comment: Comment, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Avatar(url = comment.avatar, name = comment.nickname, size = 36.dp)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(comment.nickname, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                if (comment.adminComment) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    ) {
                        Text("博主", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp))
                    }
                }
                Spacer(Modifier.weight(1f))
                Text(formatDateTime(comment.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
            Text(comment.content, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

/** 匿名发表评论弹窗（昵称 + 邮箱；后端对未登录用户要求两者必填） */
@Composable
private fun CommentDialog(vm: ArticleDetailViewModel, onDismiss: () -> Unit, onPosted: (Comment) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var nickname by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }

    val guestNick by context.guestNickname.collectAsState(initial = "")
    val guestMail by context.guestEmail.collectAsState(initial = "")
    val guestAvatarUrl by context.guestAvatar.collectAsState(initial = null)
    LaunchedEffect(guestNick, guestMail) {
        if (nickname.isEmpty()) nickname = guestNick
        if (email.isEmpty()) email = guestMail
    }

    AlertDialog(
        onDismissRequest = { if (!sending) onDismiss() },
        title = { Text("发表评论") },
        text = {
            Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = nickname,
                    onValueChange = { nickname = it },
                    label = { Text("昵称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("邮箱") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    label = { Text("说点什么…") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !sending && content.isNotBlank(),
                onClick = {
                    if (nickname.isBlank() || email.isBlank()) {
                        Toast.makeText(context, "昵称和邮箱不能为空", Toast.LENGTH_SHORT).show()
                    } else {
                        sending = true
                        scope.launch { context.saveGuest(nickname.trim(), email.trim()) }
                        vm.postComment(content.trim(), nickname.trim(), email.trim(), guestAvatarUrl ?: "") { comment ->
                            sending = false
                            if (comment != null) {
                                onPosted(comment)
                                onDismiss()
                            } else {
                                Toast.makeText(context, "评论失败", Toast.LENGTH_SHORT).show()
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