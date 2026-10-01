package com.hanphone.blog.ui.friendlinks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton

/** 友链分类展示名与展示顺序（朋友优先，其次 工具/博客/资源，与 web 友链页一致） */
private val LINK_TYPE_LABELS = listOf(
    "friend" to "朋友",
    "tool" to "工具",
    "blog" to "博客",
    "resource" to "资源"
)

/** 友链（独立页）：从「我的」进入；类型筛选 + 按类型分组，朋友优先、推荐置顶 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendLinksScreen(onBack: () -> Unit) {
    val vm: FriendLinksViewModel = hiltViewModel()
    val uriHandler = LocalUriHandler.current
    val listState = rememberLazyListState()

    val filtered = vm.filtered

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "友链", onBack = onBack)

        // 类型筛选（全部 / 朋友 / 工具 / 博客 / 资源）
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(selected = vm.activeType == null, onClick = { vm.setType(null) }, label = { Text("全部") })
            LINK_TYPE_LABELS.forEach { (type, label) ->
                FilterChip(
                    selected = vm.activeType == type,
                    onClick = { vm.setType(type) },
                    label = { Text(label) }
                )
            }
        }

        Box(Modifier.weight(1f)) {
            PullToRefreshBox(
                isRefreshing = vm.refreshing,
                onRefresh = { vm.refresh(fromPull = true) },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    vm.loading && filtered.isEmpty() -> RowListSkeleton(Modifier.padding(top = 8.dp), count = 6)
                    vm.error != null && filtered.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                    filtered.isEmpty() -> EmptyBox("暂无友链")
                    else -> LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 6.dp)
                    ) {
                        // 按类型分组，朋友优先，其次 工具/博客/资源
                        val groups = filtered.groupBy { it.type }
                        LINK_TYPE_LABELS.map { it.first }
                            .filter { groups.containsKey(it) }
                            .forEach { type ->
                                val links = groups[type] ?: emptyList()
                                item(key = "header_$type") {
                                    Row(
                                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            LINK_TYPE_LABELS.firstOrNull { it.first == type }?.second ?: type,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            "（${links.size}）",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.outline,
                                            modifier = Modifier.padding(start = 6.dp)
                                        )
                                    }
                                }
                                items(links, key = { it.id }) { link ->
                                    FriendLinkRow(link) {
                                        val url = if (link.url.startsWith("http")) link.url else "https://${link.url}"
                                        uriHandler.openUri(url)
                                    }
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                                }
                            }
                    }
                }
            }
        }
    }
}

/** 友链行：头像 + 名称（推荐角标）+ 描述 + 前往 */
@Composable
private fun FriendLinkRow(link: FriendLink, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Avatar(url = link.avatar, name = link.name, size = 44.dp, feature = ImageCaches.Feature.FRIEND)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    link.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (link.recommend) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = MaterialTheme.colorScheme.primary,
                        contentColor = Color.White
                    ) {
                        Row(
                            Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Icon(Icons.Filled.Star, null, Modifier.size(10.dp), tint = Color(0xFFFBBF24))
                            Text("推荐", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
            if (link.description.isNotBlank()) {
                Text(
                    link.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        Text("前往", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
    }
}