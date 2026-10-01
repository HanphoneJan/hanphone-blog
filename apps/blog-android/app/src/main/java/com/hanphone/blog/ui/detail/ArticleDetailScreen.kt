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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
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
    // 回复目标（非空=回复该评论）；replyHints 记录「刚发布的回复 → 父昵称」用于展示"回复 @x"
    var replyTarget by remember { mutableStateOf<Comment?>(null) }
    val replyHints = remember { mutableStateOf<Map<Long, String>>(emptyMap()) }

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
                            CommentRow(
                                comment = comment,
                                replyHint = replyHints.value[comment.id],
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                onReply = { replyTarget = comment; showCommentDialog = true }
                            )
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
            Column {
                // 细分割线 + 底色，替代原来的厚重投影面（视觉更轻、不突兀）
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                Surface(color = MaterialTheme.colorScheme.background) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        BottomActionItem(
                            icon = if (liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            label = "点赞 $likesCount",
                            tint = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            onClick = { doLike() }
                        )
                        BottomActionItem(
                            icon = Icons.Filled.Email,
                            label = "评论",
                            onClick = {
                                // 对齐网页版：登录后评论（未登录引导去登录，不再走匿名昵称/邮箱）
                                if (TokenStore.userId.value != null) {
                                    replyTarget = null
                                    showCommentDialog = true
                                } else { toast("请先登录"); onLogin() }
                            }
                        )
                        BottomActionItem(
                            icon = Icons.Filled.Share,
                            label = "分享",
                            onClick = { share() }
                        )
                    }
                }
            }
        }
    }

    if (showCommentDialog) {
        CommentDialog(
            vm = vm,
            replyTo = replyTarget,
            onDismiss = { showCommentDialog = false },
            onPosted = { newComment ->
                // 刚发布的回复：记录父昵称用于展示「回复 @x」
                replyTarget?.let { target -> replyHints.value = replyHints.value + (newComment.id to target.nickname) }
                replyTarget = null
                vm.addComment(newComment)
            }
        )
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

        // 元信息单行：分类 · 作者 · 日期 · 阅读量（不再用「作者 · x」独立行）
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
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
            val authorName = blog.user?.nickname?.ifBlank { null }
            if (authorName != null) {
                Avatar(url = blog.user?.avatar, name = authorName, size = 18.dp)
                Text(authorName, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("·", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            Text(formatDate(blog.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.weight(1f))
            Text("${blog.views} 次阅读", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
private fun CommentRow(
    comment: Comment,
    modifier: Modifier = Modifier,
    replyHint: String? = null,
    onReply: (Comment) -> Unit
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Avatar(url = comment.avatar, name = comment.nickname, size = 36.dp)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(comment.nickname, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                if (replyHint != null) {
                    Text("回复 @$replyHint", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                }
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
            TextButton(
                onClick = { onReply(comment) },
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier.padding(top = 2.dp)
            ) { Text("回复", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary) }
        }
    }
}

/** 发表评论/回复（对齐网页版）：登录后评论，只填内容；replyTo 非空时以 parentId 回复该评论 */
@Composable
private fun CommentDialog(
    vm: ArticleDetailViewModel,
    replyTo: Comment?,
    onDismiss: () -> Unit,
    onPosted: (Comment) -> Unit
) {
    val context = LocalContext.current
    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!sending) onDismiss() },
        title = { Text(if (replyTo != null) "回复 @${replyTo!!.nickname}" else "发表评论") },
        text = {
            Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    label = { Text(if (replyTo != null) "回复内容…" else "说点什么…") },
                    minLines = 2,
                    maxLines = 5,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !sending && content.isNotBlank(),
                onClick = {
                    val uid = TokenStore.userId.value
                    if (uid == null) {
                        Toast.makeText(context, "请先登录", Toast.LENGTH_SHORT).show()
                        onDismiss()
                        return@TextButton
                    }
                    sending = true
                    vm.postCommentAsUser(content.trim(), uid, replyTo?.id ?: -1L) { comment ->
                        sending = false
                        if (comment != null) {
                            onPosted(comment)
                            onDismiss()
                        } else {
                            Toast.makeText(context, "评论失败", Toast.LENGTH_SHORT).show()
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