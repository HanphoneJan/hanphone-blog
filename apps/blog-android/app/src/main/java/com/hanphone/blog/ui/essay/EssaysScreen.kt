package com.hanphone.blog.ui.essay

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayComment
import com.hanphone.blog.ui.MarkdownContent
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.BottomActionItem
import com.hanphone.blog.ui.components.DetailSkeleton
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.ListFooter
import com.hanphone.blog.ui.components.MomentsSkeleton
import com.hanphone.blog.util.formatDateTime
import com.hanphone.blog.util.resolveImageUrl

/**
 * 随笔（朋友圈风格）：扁平化 —— 无卡片、头像左置、蓝色昵称、
 * 正文可展开、图片九宫格、底部小字时间 + 胶囊操作条。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EssayListScreen(onOpenEssay: (Long) -> Unit, onLogin: () -> Unit) {
    val vm: EssayListViewModel = hiltViewModel()
    val listState = rememberLazyListState()
    val items = vm.pagerFlow.collectAsLazyPagingItems()

    val refreshing = items.loadState.refresh is LoadState.Loading
    val refreshError = items.loadState.refresh is LoadState.Error
    val appendLoading = items.loadState.append is LoadState.Loading
    val appendError = items.loadState.append is LoadState.Error
    val appendEnd = items.loadState.append.endOfPaginationReached

    // 只有用户主动下拉才显示 Refresh 圈圈；首帧（冷启动缓存/骨架）时的 Paging 后台刷新保持静默
    var userPulled by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize()) {
        PullToRefreshBox(
            isRefreshing = refreshing && userPulled,
            onRefresh = { userPulled = true; items.refresh() },
            modifier = Modifier.fillMaxSize()
        ) {
            when {
                // 冷启动秒显：Paging 首屏未到前先展示缓存内容，替代骨架屏（键一致，数据到达后无缝替换）
                items.itemCount == 0 && !vm.coldFeed.isNullOrEmpty() -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    items(vm.coldFeed.orEmpty(), key = { it.id }) { essay ->
                        MomentsRow(
                            essay = essay,
                            onOpen = { onOpenEssay(essay.id) },
                            onLogin = onLogin
                        )
                    }
                }
                items.itemCount == 0 && refreshing -> MomentsSkeleton(Modifier.padding(top = 10.dp))
                items.itemCount == 0 && refreshError -> ErrorBox("加载失败", onRetry = { items.retry() })
                items.itemCount == 0 -> EmptyBox("还没有随笔动态")
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    items(
                        count = items.itemCount,
                        key = items.itemKey { it.id },
                        contentType = { "moment" }
                    ) { index ->
                        val essay = items[index] ?: return@items
                        MomentsRow(
                            essay = essay,
                            onOpen = { onOpenEssay(essay.id) },
                            onLogin = onLogin
                        )
                    }
                    item {
                        ListFooter(
                            loadingMore = appendLoading,
                            hasMore = !appendEnd,
                            showText = items.itemCount > 0,
                            mod = if (appendError) Modifier.clickable { items.retry() } else Modifier
                        )
                        if (appendError) {
                            Text(
                                "加载失败，点击重试",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

/** 朋友圈式扁平条目：无卡片 */
@Composable
private fun MomentsRow(essay: Essay, onOpen: () -> Unit, onLogin: () -> Unit) {
    val vm: EssayListViewModel = hiltViewModel()
    val context = LocalContext.current

    fun toast(m: String) = Toast.makeText(context, m, Toast.LENGTH_SHORT).show()

    var liked by remember { mutableStateOf(essay.liked) }
    var likes by remember { mutableIntStateOf(essay.likes) }
    var expanded by remember { mutableStateOf(false) }

    // ===== 内嵌评论（可回复）=====
    var commentsOpen by remember(essay.id) { mutableStateOf(false) }
    var comments by remember(essay.id) { mutableStateOf<List<EssayComment>>(emptyList()) }
    var commentsLoading by remember { mutableStateOf(false) }
    var commentDraft by remember { mutableStateOf("") }
    var replyTarget by remember { mutableStateOf<EssayComment?>(null) }

    fun toggleComments() {
        val uid = TokenStore.userId.value
        if (uid == null) { toast("请先登录"); onLogin(); return }
        commentsOpen = !commentsOpen
        if (commentsOpen && comments.isEmpty()) {
            commentsLoading = true
            vm.loadComments(essay.id) { list ->
                if (list != null) comments = list
                commentsLoading = false
            }
        }
    }

    fun publishComment(parentId: Long) {
        val uid = TokenStore.userId.value ?: return
        val text = commentDraft.trim()
        if (text.isEmpty()) return
        vm.postEssayComment(essay.id, uid, text, parentId) { c ->
            if (c != null) {
                comments = comments + c
                commentDraft = ""
            } else toast("评论失败")
        }
    }

    val imageUrls = remember(essay) {
        (essay.essayFileUrls
            .filter { it.urlType != "video" }
            .mapNotNull { it.url }
            + listOfNotNull(essay.image))
            .distinct()
    }

    fun doLike() {
        val uid = TokenStore.userId.value
        if (uid == null) { toast("请先登录"); onLogin(); return }
        val want = !liked
        vm.likeEssay(essay.id, uid, want) { ok ->
            if (ok) {
                liked = want
                likes += if (want) 1 else -1
            } else toast("点赞失败")
        }
    }

    Row(
        Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        // 头像：朋友圈用圆角方形
        Avatar(
            url = essay.user?.avatar,
            name = essay.user?.nickname ?: "友",
            size = 44.dp,
            shape = RoundedCornerShape(8.dp)
        )
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // 蓝色昵称
            Text(
                essay.user?.nickname ?: "友",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { onOpen() }
            )
            // 正文（可展开）
            val content = essay.content.trim()
            if (content.isNotEmpty()) {
                Column(Modifier.fillMaxWidth()) {
                    Text(
                        text = content,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = if (expanded) Int.MAX_VALUE else 6,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!expanded && content.length > 90) {
                        Text(
                            "全文",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable { expanded = true }.padding(top = 2.dp)
                        )
                    }
                }
            }
            // 图片九宫格
            if (imageUrls.isNotEmpty()) {
                MomentsImageGrid(imageUrls) { onOpen() }
            }
            // 底部：小字时间 + 胶囊操作条（赞/评）
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    formatDateTime(essay.createTime),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
                Spacer(Modifier.weight(1f))
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh
                ) {
                    Row(
                        Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            Modifier.clip(RoundedCornerShape(16.dp)).clickable { doLike() }.padding(horizontal = 2.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                null,
                                Modifier.size(15.dp),
                                tint = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                " $likes",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Row(
                            Modifier.clip(RoundedCornerShape(16.dp)).clickable { toggleComments() }.padding(horizontal = 2.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Email, null, Modifier.size(15.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                if (comments.isNotEmpty() || commentsOpen) " 评 ${comments.size}" else " 评论",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            // ===== 内嵌评论（点击评论可回复）=====
            if (commentsOpen) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainerLow).padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (commentsLoading && comments.isEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                            Text("  加载评论…", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                    if (comments.isEmpty() && !commentsLoading) {
                        Text("还没有评论", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    }
                    comments.forEach { c ->
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(6.dp)).clickable { replyTarget = c }.padding(vertical = 4.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(c.user?.nickname ?: "友", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(end = 6.dp))
                            Text(c.content, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                        }
                    }
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = commentDraft,
                            onValueChange = { commentDraft = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("说点什么…") },
                            shape = RoundedCornerShape(18.dp),
                            maxLines = 3
                        )
                        IconButton(onClick = { publishComment(-1L) }, enabled = commentDraft.isNotBlank(), modifier = Modifier.padding(start = 2.dp)) {
                            Icon(Icons.Filled.Send, "发表", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }

    if (replyTarget != null) {
        EssayCommentDialog(
            essayId = essay.id,
            replyTo = replyTarget?.user?.nickname,
            parentCommentId = replyTarget?.id ?: -1L,
            onDismiss = { replyTarget = null },
            onPosted = { c -> comments = comments + c; replyTarget = null }
        )
    }
}

/** 朋友圈九宫格：1 张大图 / 2-3 一行 / 多图 3 列 */
@Composable
private fun MomentsImageGrid(urls: List<String>, onClick: () -> Unit) {
    val resolved = remember(urls) { urls.mapNotNull { resolveImageUrl(it) } }
    if (resolved.isEmpty()) return
    val cell = Modifier.aspectRatio(1f).clip(RoundedCornerShape(6.dp)).clickable { onClick() }
    when {
        resolved.size == 1 -> AsyncImage(
            model = resolved[0],
            contentDescription = null,
            modifier = Modifier.fillMaxWidth(0.6f).then(cell),
            contentScale = ContentScale.Crop
        )
        resolved.size <= 3 -> Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            resolved.forEach { url ->
                AsyncImage(model = url, contentDescription = null, modifier = Modifier.weight(1f).then(cell), contentScale = ContentScale.Crop)
            }
        }
        else -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            resolved.chunked(3).forEach { rowUrls ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    rowUrls.forEach { url ->
                        AsyncImage(model = url, contentDescription = null, modifier = Modifier.weight(1f).then(cell), contentScale = ContentScale.Crop)
                    }
                }
            }
        }
    }
}

/** 随笔详情：正文 + 图片 + 底部操作栏（点赞/评论/分享）+ 评论（登录后发） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EssayDetailScreen(essayId: Long, onBack: () -> Unit, onLogin: () -> Unit) {
    val context = LocalContext.current

    val vm: EssayDetailViewModel = hiltViewModel()
    val essay = vm.essay
    val comments = vm.comments
    val loading = vm.loading
    val error = vm.error
    val liked = vm.liked
    val likesCount = vm.likesCount
    var showCommentDialog by remember { mutableStateOf(false) }
    var replyTarget by remember { mutableStateOf<EssayComment?>(null) }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun share() {
        val url = "https://hanphone.cn/essays/$essayId"
        val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(android.content.Intent.EXTRA_TEXT, url)
        }
        context.startActivity(android.content.Intent.createChooser(send, "分享到"))
    }

    fun doLike() {
        val uid = TokenStore.userId.value
        if (uid == null) { toast("请先登录"); onLogin(); return }
        vm.toggleLike(uid)
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "", onBack = onBack)
        when {
            loading && essay == null -> Box(Modifier.weight(1f).fillMaxWidth()) { DetailSkeleton() }
            error != null && essay == null -> Box(Modifier.weight(1f).fillMaxWidth()) { ErrorBox(error!!, onRetry = { }) }
            essay != null -> {
                LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(bottom = 24.dp)) {
                    item {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Avatar(url = essay!!.user?.avatar, name = essay!!.user?.nickname ?: "友", size = 42.dp, shape = RoundedCornerShape(8.dp))
                            Column(Modifier.weight(1f)) {
                                Text(essay!!.user?.nickname ?: "友", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                                Text(formatDateTime(essay!!.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                            }
                        }
                    }
                    item { SelectionContainer { MarkdownContent(markdown = essay!!.content, modifier = Modifier.padding(horizontal = 16.dp)) } }
                    val images = essay!!.essayFileUrls.filter { it.urlType != "video" }.mapNotNull { it.url } + listOfNotNull(essay!!.image)
                    if (images.isNotEmpty()) {
                        item {
                            Column(
                                Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                images.distinct().forEach { url ->
                                    resolveImageUrl(url)?.let { resolved ->
                                        AsyncImage(
                                            model = resolved,
                                            contentDescription = null,
                                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)),
                                            contentScale = ContentScale.FillWidth
                                        )
                                    }
                                }
                            }
                        }
                    }
                    item {
                        HorizontalDivider(Modifier.padding(horizontal = 16.dp, vertical = 20.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    }
                    item {
                        Text("评论（${comments.size}）", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                    }
                    if (comments.isEmpty()) {
                        item {
                            Text("还没有评论", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp))
                        }
                    } else {
                        items(comments, key = { it.id }) { c ->
                            Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth().clickable { replyTarget = c }, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Avatar(url = c.user?.avatar, name = c.user?.nickname ?: "友", size = 36.dp)
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(c.user?.nickname ?: "友", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                        if (c.adminComment == true) {
                                            Spacer(Modifier.size(6.dp))
                                            Text("【博主】", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                    Text(c.content, style = MaterialTheme.typography.bodyMedium)
                                    Text(formatDateTime(c.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                }
                            }
                        }
                    }
                }
                // 底部操作栏（轻量：细分割线 + 单行图标文字）
                Column {
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
                                    if (TokenStore.userId.value != null) showCommentDialog = true
                                    else { toast("请先登录"); onLogin() }
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
    }

    if (showCommentDialog) {
        EssayCommentDialog(
            essayId = essayId,
            onDismiss = { showCommentDialog = false },
            onPosted = { c -> vm.addComment(c) }
        )
    }

    if (replyTarget != null) {
        EssayCommentDialog(
            essayId = essayId,
            replyTo = replyTarget?.user?.nickname,
            parentCommentId = replyTarget?.id ?: -1L,
            onDismiss = { replyTarget = null },
            onPosted = { c -> vm.addComment(c); replyTarget = null }
        )
    }
}

/** 随笔评论弹窗（需登录）。replyTo/parentCommentId 非空时为回复指定评论 */
@Composable
private fun EssayCommentDialog(
    essayId: Long,
    onDismiss: () -> Unit,
    onPosted: (EssayComment) -> Unit,
    replyTo: String? = null,
    parentCommentId: Long = -1L
) {
    val context = LocalContext.current
    val submitVm: EssayListViewModel = hiltViewModel()
    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!sending) onDismiss() },
        title = { Text(if (replyTo != null) "回复 @$replyTo" else "发表评论") },
        text = {
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text("说点什么…") },
                minLines = 3,
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = {
            TextButton(
                enabled = !sending && content.isNotBlank(),
                onClick = {
                    val uid = TokenStore.userId.value
                    if (uid == null) { onDismiss(); return@TextButton }
                    sending = true
                    submitVm.postEssayComment(essayId, uid, content.trim(), parentCommentId) { c ->
                        sending = false
                        if (c != null) {
                            onPosted(c)
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