package com.hanphone.blog.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.ui.components.ArticleCard
import com.hanphone.blog.ui.components.ArticleListSkeleton
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.ListFooter
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.util.formatDate
import com.hanphone.blog.util.parseHexColor

/**
 * 首页：搜索栏 + 已选筛选 chips + 内容区；筛选面板为【覆盖层】，
 * 叠加在内容之上弹出（不参与布局，不影响内容位置）。
 * 原单行分类栏已并入筛选面板，首页仅保留「已选筛选」chips（可单删/清除）。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onOpenBlog: (Long) -> Unit, onSearch: () -> Unit) {
    val vm: HomeViewModel = hiltViewModel()
    val listState = rememberLazyListState()

    var showFilter by remember { mutableStateOf(false) }

    val mode = vm.mode
    val items = vm.items
    val sortBy = vm.sortBy
    val selectedYear = vm.selectedYear

    // 是否有激活的筛选（分类/标签/年份）——给漏斗按钮与「已选筛选行」用
    val hasFilter = vm.selectedTypeId != null || vm.selectedTagId != null || selectedYear != null

    val shouldLoadMore by remember(listState) {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
            val total = listState.layoutInfo.totalItemsCount
            total > 0 && last >= total - 3
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (mode == "latest" && shouldLoadMore && !vm.isLoading && !vm.isRefreshing && !vm.loadingMore && vm.page < vm.totalPages && items.isNotEmpty()) {
            vm.loadMore()
        }
    }

    val visible = remember(items, sortBy) { sortBlogs(items, sortBy) }
    val years = remember(vm.archive) { vm.archive.keys.sortedByDescending { it.toIntOrNull() ?: 0 } }

    Box(Modifier.fillMaxSize()) {
        // ===== 内容层 =====
        Column(Modifier.fillMaxSize()) {
            // 顶部筛选行：搜索 + 漏斗（有激活筛选时主色高亮 + 圆点）
            Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 8.dp)) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth().height(40.dp)
                ) {
                    Row(Modifier.padding(start = 14.dp, end = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Search, null, Modifier.size(18.dp))
                        Row(
                            Modifier.weight(1f).padding(horizontal = 8.dp).clickable { onSearch() },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("搜索博客、随笔、文档…", style = MaterialTheme.typography.bodyMedium)
                        }
                        Box {
                            IconButton(onClick = { showFilter = !showFilter }, modifier = Modifier.size(32.dp)) {
                                Icon(
                                    Icons.AutoMirrored.Filled.List,
                                    "筛选",
                                    tint = if (hasFilter) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (hasFilter) {
                                Box(
                                    Modifier.align(Alignment.TopEnd).padding(top = 4.dp, end = 4.dp)
                                        .size(7.dp).clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary)
                                )
                            }
                        }
                    }
                }
            }

            // 已选筛选 chips（原分类栏位置；无筛选时不占位）
            if (hasFilter) {
                val typeName = vm.types.firstOrNull { it.id == vm.selectedTypeId }?.name
                val tagName = vm.tags.firstOrNull { it.id == vm.selectedTagId }?.name
                LazyRow(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 4.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (vm.selectedTypeId != null && typeName != null) {
                        item {
                            InputChip(
                                selected = true,
                                onClick = { vm.selectType(null) },
                                label = { Text("分类: $typeName") },
                                trailingIcon = {
                                    Icon(Icons.Filled.Close, "移除分类", Modifier.size(16.dp))
                                }
                            )
                        }
                    }
                    if (vm.selectedTagId != null && tagName != null) {
                        item {
                            InputChip(
                                selected = true,
                                onClick = { vm.selectTag(null) },
                                label = { Text("标签: $tagName") },
                                trailingIcon = {
                                    Icon(Icons.Filled.Close, "移除标签", Modifier.size(16.dp))
                                }
                            )
                        }
                    }
                    if (selectedYear != null) {
                        item {
                            InputChip(
                                selected = true,
                                onClick = { vm.selectYear(null) },
                                label = { Text("${selectedYear} 年") },
                                trailingIcon = {
                                    Icon(Icons.Filled.Close, "移除年份", Modifier.size(16.dp))
                                }
                            )
                        }
                    }
                    item {
                        SuggestionChip(
                            onClick = { vm.clearFilter() },
                            label = { Text("清除") }
                        )
                    }
                }
            }

            // 内容区
            Box(Modifier.weight(1f)) {
                PullToRefreshBox(
                    isRefreshing = vm.isRefreshing,
                    onRefresh = { vm.refresh(fromPull = true) },
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (mode == "latest") {
                        when {
                            vm.isLoading && items.isEmpty() -> ArticleListSkeleton(Modifier.padding(16.dp))
                            vm.error != null && items.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                            items.isEmpty() -> EmptyBox("暂无文章")
                            else -> LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(visible, key = { it.id }) { blog ->
                                    ArticleCard(blog = blog, onClick = { onOpenBlog(blog.id) })
                                }
                                item { ListFooter(vm.loadingMore, vm.page < vm.totalPages, items.isNotEmpty()) }
                            }
                        }
                    } else {
                        when {
                            vm.archiveLoading && vm.archive.isEmpty() -> RowListSkeleton(Modifier.padding(top = 8.dp), count = 7, leading = null)
                            vm.archiveError != null && vm.archive.isEmpty() -> ErrorBox(vm.archiveError!!, onRetry = { vm.refresh() })
                            vm.archive.isEmpty() -> EmptyBox("还没有内容")
                            else -> {
                                val targetYears = if (selectedYear != null) listOf(selectedYear!!) else years
                                LazyColumn(
                                    state = listState,
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                                ) {
                                    targetYears.forEach { year ->
                                        val blogs = vm.archive[year] ?: emptyList()
                                        item {
                                            Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Text(year, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Text("（${blogs.size} 篇）", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(start = 6.dp))
                                            }
                                        }
                                        items(blogs, key = { it.id }) { blog ->
                                            Row(
                                                Modifier.fillMaxWidth().clickable { onOpenBlog(blog.id) }.padding(vertical = 10.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    blog.title,
                                                    style = MaterialTheme.typography.bodyLarge,
                                                    modifier = Modifier.weight(1f),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(formatDate(blog.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                            }
                                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ===== 遮罩层：盖住博客内容并变暗（点击关闭）=====
        if (showFilter) {
            Box(
                Modifier.align(Alignment.TopCenter).zIndex(1f).offset(y = 58.dp).fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.35f))
                    .clickable { showFilter = false }
            )
        }

        // ===== 筛选面板：不透明、全宽贴边、无圆角无分界线（分类已并入）=====
        AnimatedVisibility(
            visible = showFilter,
            enter = expandVertically(),
            exit = shrinkVertically(),
            modifier = Modifier.align(Alignment.TopCenter).zIndex(2f).offset(y = 58.dp)
        ) {
            FilterDropDown(
                mode = mode,
                onModeChange = { vm.switchMode(it) },
                sortBy = sortBy,
                onSortChange = { vm.changeSort(it) },
                types = vm.types,
                selectedTypeId = vm.selectedTypeId,
                onTypeSelect = { vm.selectType(it) },
                tags = vm.tags,
                selectedTagId = vm.selectedTagId,
                onTagSelect = { vm.selectTag(it) },
                years = years,
                archive = vm.archive,
                selectedYear = selectedYear,
                onYearSelect = { vm.selectYear(it) },
                hasFilter = hasFilter,
                onClearAll = { vm.clearFilter() }
            )
        }
    }
}

/** 面板内小节标题：横排 chips 前的轻量分组标签 */
@Composable
private fun FilterSectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(start = 2.dp)
    )
}

@Composable
private fun FilterDropDown(
    mode: String,
    onModeChange: (String) -> Unit,
    sortBy: String,
    onSortChange: (String) -> Unit,
    types: List<Type>,
    selectedTypeId: Long?,
    onTypeSelect: (Long?) -> Unit,
    tags: List<Tag>,
    selectedTagId: Long?,
    onTagSelect: (Long?) -> Unit,
    years: List<String>,
    archive: Map<String, List<Blog>>,
    selectedYear: String?,
    onYearSelect: (String?) -> Unit,
    hasFilter: Boolean,
    onClearAll: () -> Unit
) {
    // 非卡片化：整幅贴边不透明底 + 横排 chips（小红书首页筛选），无圆角无分界线
    Column(
        Modifier.fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 视图
        FilterSectionLabel("视图")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = mode == "latest", onClick = { onModeChange("latest") }, label = { Text("最新") })
            FilterChip(selected = mode == "archive", onClick = { onModeChange("archive") }, label = { Text("归档") })
        }

        // 排序
        FilterSectionLabel("排序")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(SORT_OPTIONS) { (value, label) ->
                FilterChip(selected = sortBy == value, onClick = { onSortChange(value) }, label = { Text(label) })
            }
        }

        // 分类（原首页单行分类栏并入面板；带分类色点）
        FilterSectionLabel("分类")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                FilterChip(selected = selectedTypeId == null, onClick = { onTypeSelect(null) }, label = { Text("全部") })
            }
            items(types, key = { it.id }) { t ->
                FilterChip(
                    selected = selectedTypeId == t.id,
                    onClick = { onTypeSelect(t.id) },
                    label = {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            t.color?.parseHexColor()?.let { c ->
                                Box(Modifier.size(8.dp).clip(CircleShape).background(c))
                            }
                            Text(t.name)
                        }
                    }
                )
            }
        }

        // 标签
        FilterSectionLabel("标签")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                FilterChip(selected = selectedTagId == null, onClick = { onTagSelect(null) }, label = { Text("全部标签") })
            }
            items(tags, key = { it.id }) { t ->
                FilterChip(selected = selectedTagId == t.id, onClick = { onTagSelect(t.id) }, label = { Text(t.name) })
            }
        }

        // 年份（归档时）
        if (mode == "archive" && years.isNotEmpty()) {
            FilterSectionLabel("年份")
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilterChip(selected = selectedYear == null, onClick = { onYearSelect(null) }, label = { Text("全部年份") })
                }
                items(years) { y ->
                    FilterChip(selected = selectedYear == y, onClick = { onYearSelect(y) }, label = { Text("$y · ${archive[y]?.size ?: 0}") })
                }
            }
        }

        // 底部：有激活筛选时可一键重置
        if (hasFilter) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onClearAll) {
                    Icon(Icons.Filled.Close, null, Modifier.size(16.dp))
                    Text("重置筛选", modifier = Modifier.padding(start = 4.dp))
                }
            }
        }
    }
}

private val SORT_OPTIONS = listOf(
    "newest" to "最新发布",
    "oldest" to "最早发布",
    "recommend" to "推荐优先",
    "mostViewed" to "最多阅读",
    "leastViewed" to "最少阅读"
)

private fun sortBlogs(list: List<Blog>, sort: String): List<Blog> = when (sort) {
    "oldest" -> list.sortedBy { it.createTime?.time ?: 0L }
    "recommend" -> list.sortedWith(compareByDescending<Blog> { it.recommend }.thenByDescending { it.createTime?.time ?: 0L })
    "mostViewed" -> list.sortedByDescending { it.views }
    "leastViewed" -> list.sortedBy { it.views }
    else -> list.sortedByDescending { it.createTime?.time ?: 0L }
}