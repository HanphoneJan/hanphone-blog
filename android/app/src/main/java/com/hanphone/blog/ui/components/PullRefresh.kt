package com.hanphone.blog.ui.components

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * 下拉刷新的统一接入点。
 *
 * 页面侧只写 `PullRefresh(vm) { 列表 }`，不再各自 import / 摆 `PullToRefreshBox`；
 * 但**重拉什么数据仍由各 VM 的 [refresh] 决定**——这正是之前「我的」页踩过的坑：
 * 刷新只重拉了统计、没重拉资料。新页面实现本接口时，refresh() 必须是完整的重新加载。
 */
interface PullRefreshHost {
    val refreshing: Boolean
    fun refresh()
}

/** 有 VM 的页面统一用这个重载 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PullRefresh(
    host: PullRefreshHost,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    PullToRefreshBox(
        isRefreshing = host.refreshing,
        onRefresh = host::refresh,
        modifier = modifier,
        content = content
    )
}

/** 页面内自带刷新状态时用这个重载（如 Paging 的 `items.refresh()`、本地文件预览） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PullRefresh(
    refreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = onRefresh,
        modifier = modifier,
        content = content
    )
}
