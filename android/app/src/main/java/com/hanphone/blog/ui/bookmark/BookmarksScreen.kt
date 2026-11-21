package com.hanphone.blog.ui.bookmark

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.BookmarkStore
import com.hanphone.blog.data.model.BookmarkItem
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.ui.components.rememberToast
import kotlinx.coroutines.launch

private val TABS = listOf(
    BookmarkStore.BLOG to "博客",
    BookmarkStore.ESSAY to "随笔",
    BookmarkStore.DOC to "文档"
)

/**
 * 我的收藏：Tabs（博客/随笔/文档）+ 列表 + 取消收藏。
 * 取消用 [BookmarkStore] 的乐观更新，列表按 keys 过滤，条目立即消失。
 */
@Composable
fun BookmarksScreen(
    onBack: () -> Unit,
    onOpenArticle: (Long) -> Unit,
    onOpenEssay: (Long) -> Unit,
    onOpenDocs: () -> Unit,
    onLogin: () -> Unit
) {
    val vm: BookmarksViewModel = hiltViewModel()
    val token by TokenStore.token.collectAsState()
    val bookmarkKeys by BookmarkStore.keys.collectAsState()
    val scope = rememberCoroutineScope()
    val toast = rememberToast()

    LaunchedEffect(token) {
        if (token != null) vm.loadIfNeeded()
    }

    val tabIndex = TABS.indexOfFirst { it.first == vm.tab }.coerceAtLeast(0)
    val visible = vm.items.filter {
        it.type.equals(vm.tab, ignoreCase = true) && BookmarkStore.id(it.type, it.key) in bookmarkKeys
    }

    fun open(item: BookmarkItem) {
        when (item.type.uppercase()) {
            BookmarkStore.BLOG -> item.key.toLongOrNull()?.let(onOpenArticle)
            BookmarkStore.ESSAY -> item.key.toLongOrNull()?.let(onOpenEssay)
            // 文档深链本轮只到文库列表
            BookmarkStore.DOC -> onOpenDocs()
        }
    }

    fun cancel(item: BookmarkItem) {
        scope.launch {
            if (vm.cancel(item) == null) toast("取消收藏失败，请稍后再试")
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "我的收藏", onBack = onBack)

        if (token == null) {
            LoginGuide(onLogin)
        } else {
            TabRow(selectedTabIndex = tabIndex) {
                TABS.forEach { (type, label) ->
                    Tab(
                        selected = vm.tab == type,
                        onClick = { vm.selectTab(type) },
                        text = { Text(label, style = MaterialTheme.typography.labelLarge) }
                    )
                }
            }

            PullRefresh(vm, Modifier.weight(1f).fillMaxWidth()) {
                when {
                    vm.loading && vm.items.isEmpty() -> RowListSkeleton(leading = 36.dp, contentPadding = 16.dp)
                    vm.error != null && vm.items.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                    visible.isEmpty() -> EmptyBox("还没有收藏")
                    else -> LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 4.dp)
                    ) {
                        items(visible, key = { "${it.type}:${it.key}" }) { item ->
                            BookmarkRow(
                                item = item,
                                onClick = { open(item) },
                                onCancel = { cancel(item) }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LoginGuide(onLogin: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("请先登录", style = MaterialTheme.typography.titleMedium)
        Text(
            "登录后可收藏博客、随笔与文档",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 6.dp)
        )
        Button(onClick = onLogin, modifier = Modifier.padding(top = 16.dp)) { Text("去登录") }
    }
}

/** 收藏条目：类型徽标 + 标题/副标题 + 取消收藏（右侧固定 24dp，标题 weight(1f, fill=false) 防挤压） */
@Composable
private fun BookmarkRow(
    item: BookmarkItem,
    onClick: () -> Unit,
    onCancel: () -> Unit
) {
    // subtitle 服务端可能为空/null，空则不渲染副标题
    val subtitle = item.subtitle.orEmpty()
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(start = 16.dp, end = 4.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        TypeBadge(item.type)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    item.title.ifBlank { "（无标题）" },
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
            }
            if (subtitle.isNotBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        IconButton(onClick = onCancel, modifier = Modifier.size(40.dp)) {
            Icon(
                Icons.Filled.Bookmark,
                contentDescription = "取消收藏",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}

@Composable
private fun TypeBadge(type: String) {
    val (label, color) = when (type.uppercase()) {
        BookmarkStore.BLOG -> "博客" to MaterialTheme.colorScheme.primary
        BookmarkStore.ESSAY -> "随笔" to MaterialTheme.colorScheme.tertiary
        else -> "文档" to MaterialTheme.colorScheme.secondary
    }
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.12f),
        contentColor = color,
        modifier = Modifier.size(34.dp)
    ) {
        Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
}
