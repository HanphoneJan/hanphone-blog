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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.core.draftFlow
import com.hanphone.blog.core.saveDraft
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayComment
import com.hanphone.blog.ui.MarkdownContent
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.BottomActionItem
import com.hanphone.blog.ui.components.CommentInputBar
import com.hanphone.blog.ui.components.DetailSkeleton
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.ListFooter
import com.hanphone.blog.ui.components.MomentsSkeleton
import com.hanphone.blog.ui.components.hideKeyboard
import com.hanphone.blog.util.formatDateTime
import com.hanphone.blog.util.resolveImageUrl
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** 每篇随笔默认展开展示的评论条数上限，超出则折叠并提供「展开全部」 */
private const val COMMENT_SHOW_LIMIT = 5

/**
 * 随笔（朋友圈风格）：扁平化 —— 无卡片、头像左置、蓝色昵称、
 * 正文可展开、图片九宫格、底部小字时间 + 胶囊操作条。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EssayListScreen(onOpenEssay: (Long) -> Unit, onLogin: () -> Unit) {
    val vm: EssayListViewModel = hiltViewModel()
    val context = LocalContext.current
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val items = vm.pagerFlow.collectAsLazyPagingItems()

    val refreshing = items.loadState.refresh is LoadState.Loading
    val refreshError = items.loadState.refresh is LoadState.Error
    val appendLoading = items.loadState.append is LoadState.Loading
    val appendError = items.loadState.append is LoadState.Error
    val appendEnd = items.loadState.append.endOfPaginationReached

    // 只有用户主动下拉才显示 Refresh 圈圈；首帧（冷启动缓存/骨架）时的 Paging 后台刷新保持静默
    var userPulled by remember { mutableStateOf(false) }

    // ===== 底部评论输入（独立按钮「写评论」/点评论触发；弹出时自动拉起键盘）=====
    var compose by remember { mutableStateOf<EssayCompose?>(null) }
    var sending by remember { mutableStateOf(false) }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
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
                        contentPadding = PaddingValues(vertical = 6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        itemsIndexed(vm.coldFeed.orEmpty(), key = { _, essay -> essay.id }) { index, essay ->
                            if (index > 0) {
                                HorizontalDivider(
                                    Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                                )
                            }
                            MomentsRow(
                                essay = essay,
                                onOpen = { onOpenEssay(essay.id) },
                                onLogin = onLogin,
                                onComment = { essayId -> compose = EssayCompose(essayId, null) },
                                onReply = { essayId, c -> compose = EssayCompose(essayId, c) }
                            )
                        }
                    }
                    items.itemCount == 0 && refreshing -> MomentsSkeleton(Modifier.padding(top = 10.dp))
                    items.itemCount == 0 && refreshError -> ErrorBox("加载失败", onRetry = { items.retry() })
                    items.itemCount == 0 -> EmptyBox("还没有随笔动态")
                    else -> LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(
                            count = items.itemCount,
                            key = items.itemKey { it.id },
                            contentType = { "moment" }
                        ) { index ->
                            val essay = items[index] ?: return@items
                            // 随笔之间以细分割线分隔
                            if (index > 0) {
                                HorizontalDivider(
                                    Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                                )
                            }
                            MomentsRow(
                                essay = essay,
                                onOpen = { onOpenEssay(essay.id) },
                                onLogin = onLogin,
                                onComment = { essayId -> compose = EssayCompose(essayId, null) },
                                onReply = { essayId, c -> compose = EssayCompose(essayId, c) }
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

        // ===== 底部弹出评论输入条（输入法随焦点弹出）=====
        compose?.let { c ->
            val essayId = c.essayId
            val draftKey = remember(essayId) { "essay_comment_$essayId" }
            var content by remember(essayId) { mutableStateOf("") }
            LaunchedEffect(essayId) { content = context.draftFlow(draftKey).first() }
            LaunchedEffect(content) {
                delay(400)
                context.saveDraft(draftKey, content)
            }
            CommentInputBar(
                value = content,
                onValueChange = { content = it },
                onSend = {
                    val uid = TokenStore.userId.value
                    if (uid == null) {
                        toast("请先登录"); onLogin(); compose = null; return@CommentInputBar
                    }
                    if (sending) return@CommentInputBar
                    val text = content.trim()
                    if (text.isEmpty()) return@CommentInputBar
                    sending = true
                    vm.postEssayComment(essayId, uid, text, c.replyTo?.id ?: -1L) { comment ->
                        sending = false
                        if (comment != null) {
                            vm.addEssayComment(essayId, comment)
                            content = ""
                            scope.launch { context.saveDraft(draftKey, "") }
                            hideKeyboard(context, view)
                            compose = null
                        } else {
                            toast("评论失败")
                        }
                    }
                },
                sendEnabled = content.isNotBlank() && !sending,
                placeholder = if (c.replyTo != null) "回复 @${c.replyTo.user?.nickname}…" else "说点什么…",
                replyName = c.replyTo?.user?.nickname,
                onCancelReply = { compose = c.copy(replyTo = null) },
                autoFocus = true,
                trailing = {
                    IconButton(
                        onClick = { compose = null; hideKeyboard(context, view) },
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(Icons.Filled.Close, "收起", modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.outline)
                    }
                }
            )
        }
    }
}

/** 随笔页底部评论输入的目标随笔与回复对象 */
private data class EssayCompose(val essayId: Long, val replyTo: EssayComment?)

/** 朋友圈式扁平条目：无卡片 */
@Composable
private fun MomentsRow(
    essay: Essay,
    onOpen: () -> Unit,
    onLogin: () -> Unit,
    onComment: (Long) -> Unit,           // 点「写评论」→ 弹出底部输入条（新评论）
    onReply: (Long, EssayComment) -> Unit // 点某条评论 → 底部输入条（回复该评论）
) {
    val vm: EssayListViewModel = hiltViewModel()
    val context = LocalContext.current

    fun toast(m: String) = Toast.makeText(context, m, Toast.LENGTH_SHORT).show()

    var liked by remember { mutableStateOf(essay.liked) }
    var expanded by remember { mutableStateOf(false) }

    // ===== 评论区（默认展开加载；过多折叠部分；整区可收起/展开；输入框不在区内，由底部输入条承担）=====
    var commentsOpen by remember(essay.id) { mutableStateOf(true) }
    var commentsLoaded by remember(essay.id) { mutableStateOf(false) }
    var showAllComments by remember(essay.id) { mutableStateOf(false) }
    // 评论数据收在 VM（页面级），底部输入条提交后经 VM 即时回显
    val comments = vm.essayComments[essay.id] ?: emptyList()

    // 默认展开 + 自动加载评论（LazyColumn 只组合可见项；VM 内存缓存避免滚动重复请求）
    LaunchedEffect(essay.id) {
        if (!commentsLoaded) {
            vm.loadComments(essay.id) { commentsLoaded = true }
        }
    }

    fun toggleComments() {
        commentsOpen = !commentsOpen
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
            if (ok) liked = want else toast("点赞失败")
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
            // 底部：小字时间 + 胶囊操作条（赞 / 写评论 / 评·折叠）
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
                // 胶囊操作条：紧凑内边距 + 小图标，高度与时间行(约16dp)协调，不抢视觉
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh
                ) {
                    Row(
                        Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // 赞（仅图标）
                        Row(
                            Modifier.clip(RoundedCornerShape(16.dp)).clickable { doLike() }.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                contentDescription = "点赞",
                                Modifier.size(14.dp),
                                tint = if (liked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        // 写评论
                        Row(
                            Modifier.clip(RoundedCornerShape(16.dp)).clickable { onComment(essay.id) }.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Create, contentDescription = "写评论", Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        // 评论区折叠/展开
                        Row(
                            Modifier.clip(RoundedCornerShape(16.dp)).clickable { toggleComments() }.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Email,
                                contentDescription = if (commentsOpen) "收起评论" else "展开评论",
                                Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            // ===== 评论区（无评论不渲染空态；点击评论 → 底部输入条回复）=====
            if (commentsOpen && comments.isNotEmpty()) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainerLow).padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 评论过多默认折叠部分，展示前 N 条 + 展开入口
                    val visibleComments = if (showAllComments) comments else comments.take(COMMENT_SHOW_LIMIT)
                    visibleComments.forEach { c ->
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(6.dp)).clickable { onReply(essay.id, c) }.padding(vertical = 4.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(c.user?.nickname ?: "友", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(end = 6.dp))
                            Text(c.content, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                        }
                    }
                    if (comments.size > COMMENT_SHOW_LIMIT) {
                        Text(
                            if (showAllComments) "收起多余评论" else "展开全部评论（${comments.size} 条）",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable { showAllComments = !showAllComments }.padding(top = 2.dp)
                        )
                    }
                }
            }
        }
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
                    if (comments.isNotEmpty()) {
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
    val scope = rememberCoroutineScope()
    val submitVm: EssayListViewModel = hiltViewModel()
    // 草稿持久化（按随笔 id 分键，进入弹窗恢复、发送后清除）
    val draftKey = remember(essayId) { "essay_detail_comment_$essayId" }
    var content by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { content = context.draftFlow(draftKey).first() }
    LaunchedEffect(content) {
        delay(400)
        context.saveDraft(draftKey, content)
    }

    AlertDialog(
        onDismissRequest = { if (!sending) onDismiss() },
        title = { Text(if (replyTo != null) "回复 @$replyTo" else "发表评论") },
        text = {
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text("说点什么…") },
                minLines = 2,
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
                            content = ""
                            scope.launch { context.saveDraft(draftKey, "") }
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