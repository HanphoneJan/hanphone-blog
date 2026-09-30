package com.hanphone.blog.ui.friendlinks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton

/** 友链（独立页）：从「我的」进入 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendLinksScreen(onBack: () -> Unit) {
    val vm: FriendLinksViewModel = hiltViewModel()
    val uriHandler = LocalUriHandler.current
    val listState = rememberLazyListState()

    val links = vm.links

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("友链", fontWeight = FontWeight.SemiBold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "返回") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            windowInsets = WindowInsets(0.dp)
        )
        Box(Modifier.weight(1f)) {
            PullToRefreshBox(
                isRefreshing = vm.refreshing,
                onRefresh = { vm.refresh(fromPull = true) },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    vm.loading && links.isEmpty() -> RowListSkeleton(Modifier.padding(top = 8.dp), count = 6)
                    vm.error != null && links.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                    links.isEmpty() -> EmptyBox("暂无友链")
                    else -> LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 6.dp)
                    ) {
                        items(links, key = { it.id }) { link ->
                            Row(
                                Modifier.fillMaxWidth()
                                    .clickable {
                                        val url = if (link.url.startsWith("http")) link.url else "https://${link.url}"
                                        uriHandler.openUri(url)
                                    }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Avatar(url = link.avatar, name = link.name, size = 44.dp)
                                Column(Modifier.weight(1f)) {
                                    Text(link.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                                    if (link.description.isNotBlank()) {
                                        Text(link.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                                    }
                                }
                                Text("前往", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                        }
                    }
                }
            }
        }
    }
}