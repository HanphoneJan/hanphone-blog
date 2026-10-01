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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.hanphone.blog.core.draftFlow
import com.hanphone.blog.core.saveDraft
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.ui.MarkdownBlockContent
import com.hanphone.blog.ui.extractTocHeadings
import com.hanphone.blog.ui.splitMarkdownBlocks
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.CommentInputBar
import com.hanphone.blog.ui.components.DetailSkeleton
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.hideKeyboard
import com.hanphone.blog.util.formatDate
import com.hanphone.blog.util.formatDateTime
import com.hanphone.blog.util.resolveImageUrl
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
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

    // 回复目标（非空=回复该评论）；replyHints 记录「刚发布的回复 → 父昵称」用于展示"回复 @x"
    var replyTarget by remember { mutableStateOf<Comment?>(null) }
    val replyHints = remember { mutableStateOf<Map<Long, String>>(emptyMap()) }

    // ===== 底部评论输入（草稿持久化到 DataStore，防误退丢失）=====
    val view = LocalView.current
    val draftKind = remember(blogId) { "article_comment_$blogId" }
    var commentDraft by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    // 进入页面恢复草稿；输入停顿 400ms 后落盘
    LaunchedEffect(Unit) { commentDraft = context.draftFlow(draftKind).first() }
    LaunchedEffect(commentDraft) {
        delay(400)
        context.saveDraft(draftKind, commentDraft)
    }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun doComment() {
        val uid = TokenStore.userId.value
        if (uid == null) { toast("请先登录"); onLogin(); return }
        if (sending) return
        val text = commentDraft.trim()
        if (text.isEmpty()) return
        sending = true
        vm.postCommentAsUser(text, uid, replyTarget?.id ?: -1L) { comment ->
            sending = false
            if (comment != null) {
                replyTarget?.let { target -> replyHints.value = replyHints.value + (comment.id to target.nickname) }
                replyTarget = null
                commentDraft = ""
                scope.launch { context.saveDraft(draftKind, "") }
                hideKeyboard(context, view)
                vm.addComment(comment)
            } else {
                toast("评论失败")
            }
        }
    }

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
                        SelectionContainer {
                            MarkdownBlockContent(
                                block = block,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
                            )
                        }
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
                                onReply = { replyTarget = comment }
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
            // 底部操作栏：点赞 + 评论输入 + 分享（评论输入钉在底部，替代弹窗）
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            CommentInputBar(
                value = commentDraft,
                onValueChange = { commentDraft = it },
                onSend = { doComment() },
                sendEnabled = commentDraft.isNotBlank() && !sending,
                placeholder = if (replyTarget != null) "回复 @${replyTarget!!.nickname}…" else "说点什么…",
                replyName = replyTarget?.nickname,
                onCancelReply = { replyTarget = null },
                leading = {
                    Row(
                        Modifier.clip(RoundedCornerShape(8.dp)).clickable { doLike() }.padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(
                            if (liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            null,
                            Modifier.size(20.dp),
                            tint = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text("$likesCount", style = MaterialTheme.typography.labelMedium, color = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                trailing = {
                    Row(
                        Modifier.clip(RoundedCornerShape(8.dp)).clickable { share() }.padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(Icons.Filled.Share, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("分享", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            )
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
                imageLoader = ImageCaches.loader(ImageCaches.Feature.BLOG),
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
            // 点击内容回复（替代独立回复按钮，压缩纵向间距）；内容可长按选中复制
            SelectionContainer {
                Text(
                    comment.content,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.pointerInput(comment.id) {
                        detectTapGestures { onReply(comment) }
                    }
                )
            }
        }
    }
}