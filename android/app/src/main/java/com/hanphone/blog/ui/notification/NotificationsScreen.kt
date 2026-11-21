package com.hanphone.blog.ui.notification

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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.model.NotificationVO
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.ListFooter
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.util.formatDateTime

/**
 * 站内通知：评论/回复提醒列表。
 * 未登录显示登录引导；点条目先把该条标记已读，再按 targetType 打开文章/随笔。
 */
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    onOpenArticle: (Long) -> Unit,
    onOpenEssay: (Long) -> Unit,
    onLogin: () -> Unit
) {
    val vm: NotificationsViewModel = hiltViewModel()
    val token by TokenStore.token.collectAsState()
    val listState = rememberLazyListState()
    val items = vm.items

    // 登录后回到本页（或在未登录态进入后完成登录）时补一次首载
    LaunchedEffect(token) {
        if (token != null) vm.loadIfNeeded()
    }

    val shouldLoadMore by remember(listState) {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
            val total = listState.layoutInfo.totalItemsCount
            total > 0 && last >= total - 3
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) vm.loadMore()
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(
            title = "通知",
            onBack = onBack,
            actions = {
                if (token != null && vm.unread > 0) {
                    TextButton(onClick = { vm.markAllRead() }) {
                        Text("全部已读", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        )

        when {
            token == null -> LoginGuide(onLogin)
            else -> PullRefresh(vm, Modifier.weight(1f).fillMaxWidth()) {
                when {
                    vm.loading && items.isEmpty() -> RowListSkeleton(leading = 40.dp, contentPadding = 16.dp)
                    vm.error != null && items.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                    items.isEmpty() -> EmptyBox("暂无通知")
                    else -> LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 12.dp)
                    ) {
                        items(items, key = { it.id }) { n ->
                            NotificationRow(
                                n = n,
                                onClick = {
                                    vm.markRead(n)
                                    when (n.targetType.uppercase()) {
                                        "BLOG" -> if (n.targetId > 0) onOpenArticle(n.targetId)
                                        "ESSAY" -> if (n.targetId > 0) onOpenEssay(n.targetId)
                                    }
                                }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                        }
                        item {
                            ListFooter(vm.loadingMore, vm.hasMore, items.isNotEmpty())
                        }
                    }
                }
            }
        }
    }
}

/** 未登录：不发请求，只给登录入口 */
@Composable
private fun LoginGuide(onLogin: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("请先登录", style = MaterialTheme.typography.titleMedium)
        Text(
            "登录后可查看评论与回复提醒",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 6.dp)
        )
        Button(onClick = onLogin, modifier = Modifier.padding(top = 16.dp)) { Text("去登录") }
    }
}

/** 单条通知：头像（未读小圆点）+ 昵称/类型 + 摘要 + 时间 */
@Composable
private fun NotificationRow(n: NotificationVO, onClick: () -> Unit) {
    // actorName / excerpt 在服务端匿名或空内容时可能为 null（见 NotificationVO 注释）
    val actorName = n.actorName?.takeIf { it.isNotBlank() } ?: "有人"
    val excerpt = n.excerpt.orEmpty()
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box {
            Avatar(
                url = n.actorAvatar,
                name = actorName,
                size = 40.dp,
                feature = ImageCaches.Feature.BLOG
            )
            if (!n.read) {
                Box(
                    Modifier.align(Alignment.TopEnd)
                        .offset(x = 1.dp, y = (-1).dp)
                        .size(9.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.error)
                )
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    actorName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    typeLabel(n.type),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1
                )
            }
            if (excerpt.isNotBlank()) {
                Text(
                    excerpt,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        Text(
            formatDateTime(n.createTime),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline,
            maxLines = 1
        )
    }
}

private fun typeLabel(type: String): String = when (type.uppercase()) {
    "BLOG_COMMENT" -> "博客评论"
    "ESSAY_COMMENT" -> "随笔评论"
    else -> "通知"
}
