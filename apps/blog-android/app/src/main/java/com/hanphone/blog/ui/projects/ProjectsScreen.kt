package com.hanphone.blog.ui.projects

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.SkeletonBox
import com.hanphone.blog.util.resolveImageUrl

/** 类型展示名（与 web PROJECT_LABELS 一致；0=不展示已由后端过滤） */
private val PROJECT_TYPE_NAMES = mapOf(
    1 to "完整项目",
    2 to "工具箱",
    3 to "小游戏",
    4 to "小练习"
)

/** 项目页：类型筛选 chips + 分组卡片（完整项目=大卡片，其余=双列网格），点击用 WebView 打开链接 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(onBack: () -> Unit, onOpenUrl: (url: String, title: String) -> Unit) {
    val vm: ProjectsViewModel = hiltViewModel()
    val listState = rememberLazyListState()

    fun open(project: Project) {
        val u = project.url?.trim().orEmpty()
        if (u.isEmpty()) return
        val full = if (u.startsWith("http://") || u.startsWith("https://")) u else "https://$u"
        onOpenUrl(full, project.title)
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("项目", fontWeight = FontWeight.SemiBold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "返回") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            windowInsets = WindowInsets(0.dp)
        )

        // 搜索（标题 / 内容 / 技术栈，实时过滤）
        OutlinedTextField(
            value = vm.query,
            onValueChange = { vm.onQueryChange(it) },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            placeholder = { Text("搜索项目标题、内容或技术栈…", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            leadingIcon = { Icon(Icons.Filled.Search, null) },
            trailingIcon = {
                if (vm.query.isNotEmpty()) {
                    IconButton(onClick = { vm.onQueryChange("") }) { Icon(Icons.Filled.Close, "清除搜索") }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(24.dp)
        )

        // 类型筛选（全部 / 完整项目 / 工具箱 / 小游戏 / 小练习）
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(selected = vm.activeType == null, onClick = { vm.setType(null) }, label = { Text("全部") })
            listOf(1, 2, 3, 4).forEach { type ->
                FilterChip(
                    selected = vm.activeType == type,
                    onClick = { vm.setType(type) },
                    label = { Text(PROJECT_TYPE_NAMES[type] ?: "项目") }
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
                    vm.loading && vm.projects.isEmpty() -> ProjectGridSkeleton()
                    vm.error != null && vm.projects.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                    vm.filtered.isEmpty() -> EmptyBox(if (vm.query.isNotBlank()) "未找到相关项目" else "暂无项目")
                    else -> {
                        // 按类型分组并排序（1 完整项目在前，其余类型按 id 序）
                        val groups = vm.filtered.groupBy { it.type }
                            .toSortedMap(compareBy { if (it in 1..4) it else 5 })
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            groups.forEach { (type, items) ->
                                item(key = "header_$type") {
                                    Text(
                                        PROJECT_TYPE_NAMES[type] ?: "完整项目",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                                if (type == 1) {
                                    // 完整项目：大卡片（图片左、内容右）
                                    items(items, key = { "p${it.id}" }) { project ->
                                        LargeProjectCard(project) { open(project) }
                                    }
                                } else {
                                    // 工具箱/小游戏/小练习：双列小网格
                                    item(key = "grid_$type") {
                                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                            items.chunked(2).forEach { chunk ->
                                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                                    chunk.forEach { project ->
                                                        SmallProjectCard(project, Modifier.weight(1f)) { open(project) }
                                                    }
                                                    if (chunk.size == 1) Spacer(Modifier.weight(1f))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** 完整项目大卡片：图片左置 + 标题/描述/技术栈 */
@Composable
private fun LargeProjectCard(project: Project, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row {
            Box(
                Modifier.width(128.dp).height(132.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                AsyncImage(
                    model = project.picUrl?.let { resolveImageUrl(it) },
                    contentDescription = project.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                if (project.recommend) {
                    RecommendBadge(Modifier.align(Alignment.TopStart).padding(6.dp))
                }
            }
            Column(Modifier.weight(1f).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    project.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    project.content,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                TechChips(project.techs)
            }
        }
    }
}

/** 小卡片（工具箱/小游戏/小练习）：图片上置 + 内容下置 */
@Composable
private fun SmallProjectCard(project: Project, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            Box(
                Modifier.fillMaxWidth().height(108.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                AsyncImage(
                    model = project.picUrl?.let { resolveImageUrl(it) },
                    contentDescription = project.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                if (project.recommend) {
                    RecommendBadge(Modifier.align(Alignment.TopEnd).padding(6.dp))
                }
            }
            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    project.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    project.content,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                TechChips(project.techs)
            }
        }
    }
}

/** 推荐角标 */
@Composable
private fun RecommendBadge(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = MaterialTheme.colorScheme.primary,
        contentColor = Color.White
    ) {
        Row(
            Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Icon(Icons.Filled.Star, null, Modifier.size(11.dp), tint = Color(0xFFFBBF24))
            Text("推荐", style = MaterialTheme.typography.labelSmall)
        }
    }
}

/** 技术栈标签（逗号分隔，自动换行，对应 web 的 techs tags） */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TechChips(techs: String) {
    val list = techs.split(',').map { it.trim() }.filter { it.isNotBlank() }
    if (list.isEmpty()) return
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        list.forEach { tech ->
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                Text(tech, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
            }
        }
    }
}

/** 项目页首载骨架：分组标题 + 大卡片 ×2 + 双列网格 */
@Composable
private fun ProjectGridSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SkeletonBox(Modifier.width(96.dp).height(18.dp), RoundedCornerShape(4.dp))
        repeat(2) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row {
                    SkeletonBox(Modifier.width(128.dp).height(132.dp), RoundedCornerShape(0.dp))
                    Column(Modifier.weight(1f).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SkeletonBox(Modifier.fillMaxWidth(0.8f).height(16.dp), RoundedCornerShape(4.dp))
                        SkeletonBox(Modifier.fillMaxWidth(0.95f).height(11.dp), RoundedCornerShape(4.dp))
                        SkeletonBox(Modifier.fillMaxWidth(0.6f).height(11.dp), RoundedCornerShape(4.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            SkeletonBox(Modifier.size(44.dp, 18.dp), RoundedCornerShape(4.dp))
                            SkeletonBox(Modifier.size(36.dp, 18.dp), RoundedCornerShape(4.dp))
                        }
                    }
                }
            }
        }
        SkeletonBox(Modifier.width(96.dp).height(18.dp), RoundedCornerShape(4.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(2) {
                Column(Modifier.weight(1f)) {
                    SkeletonBox(Modifier.fillMaxWidth().height(108.dp), RoundedCornerShape(12.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.8f).height(14.dp).padding(top = 8.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.9f).height(10.dp).padding(top = 8.dp), RoundedCornerShape(4.dp))
                }
            }
        }
    }
}