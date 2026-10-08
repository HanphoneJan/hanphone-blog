@file:OptIn(ExperimentalLayoutApi::class)

package com.hanphone.blog.ui.hot

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.model.BenchmarkMeta
import com.hanphone.blog.data.model.HotFeedItem
import com.hanphone.blog.data.model.LeaderboardTrend
import com.hanphone.blog.data.model.ModelBenchmarkRow
import com.hanphone.blog.data.model.ModelCompare
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.ui.components.SkeletonBox
import com.hanphone.blog.util.formatDate
import java.net.URLEncoder
import kotlin.math.max
import kotlin.math.roundToInt

/** 分类展示名（与 web InsightClient FALLBACK_LABELS 一致） */
private val FEED_LABELS = mapOf(
    "github" to "GitHub 热门",
    "hf" to "Hugging Face 趋势",
    "ai-news" to "AI 要闻"
)

/** 模态展示名（与 web MODALITY_LABELS 一致） */
private val MODALITY_LABELS = mapOf(
    "text" to "文本",
    "coding" to "代码",
    "agent" to "智能体",
    "embedding" to "Embedding",
    "image" to "生图",
    "video" to "生视频",
    "speech" to "语音"
)

private val CHART_PALETTE = listOf(
    Color(0xFF3B82F6), Color(0xFF10B981), Color(0xFFF59E0B),
    Color(0xFFEC4899), Color(0xFF8B5CF6), Color(0xFF06B6D4)
)

/**
 * 热点聚合（对标 web /insight）：热点流 / 模型榜单 / 综合对比 三视图。
 * 移动端适配：榜单以卡片列表呈现（而非网页横向大表），对比保留「指标 × 模型」表格（左右滑动）。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HotScreen(
    onBack: () -> Unit,
    onOpenUrl: (url: String, title: String) -> Unit
) {
    val vm: HotViewModel = hiltViewModel()

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "热点", onBack = onBack)

        // 视图切换
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(
                selected = vm.view == HotView.FEED,
                onClick = { vm.switchView(HotView.FEED) },
                label = { Text("热点") },
                leadingIcon = { Icon(Icons.Filled.LocalFireDepartment, null, Modifier.size(16.dp)) }
            )
            FilterChip(
                selected = vm.view == HotView.LEADERBOARD,
                onClick = { vm.switchView(HotView.LEADERBOARD) },
                label = { Text("榜单") },
                leadingIcon = { Icon(Icons.Filled.EmojiEvents, null, Modifier.size(16.dp)) }
            )
            FilterChip(
                selected = vm.view == HotView.COMPARE,
                onClick = { vm.switchView(HotView.COMPARE) },
                label = { Text("对比") },
                leadingIcon = { Icon(Icons.Filled.Layers, null, Modifier.size(16.dp)) }
            )
        }

        Box(Modifier.weight(1f)) {
            when (vm.view) {
                HotView.FEED -> FeedTab(vm, onOpenUrl)
                HotView.LEADERBOARD -> LeaderboardTab(vm, onOpenUrl)
                HotView.COMPARE -> CompareTab(vm)
            }
        }
    }
}

// =====================================================================
// 热点
// =====================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FeedTab(vm: HotViewModel, onOpenUrl: (String, String) -> Unit) {
    val labels = remember(vm.overview) {
        buildMap {
            putAll(FEED_LABELS)
            vm.overview?.categories?.forEach { c -> put(c.key, c.label) }
        }
    }
    val totalItems = HotViewModel.FEED_CATEGORIES.sumOf { vm.feeds[it]?.size ?: 0 }
    val visible = if (vm.activeCategory == "all") HotViewModel.FEED_CATEGORIES else listOf(vm.activeCategory)

    Column(Modifier.fillMaxSize()) {
        // 总览信息行
        vm.overview?.let { ov ->
            val updated = formatRelative(ov.updatedAt)
            val unhealthy = ov.sourceTotal > 0 && ov.sourceHealthy < ov.sourceTotal
            Text(
                buildString {
                    append("最后更新：").append(updated.ifBlank { "暂无数据" })
                    append(" · 收录 ").append(ov.itemTotal)
                    append(" · 信源 ").append(ov.sourceHealthy).append("/").append(ov.sourceTotal)
                    if (unhealthy) append(" · 部分信源暂不可用")
                },
                style = MaterialTheme.typography.labelSmall,
                color = if (unhealthy) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp)
            )
        }

        // 分类 chips
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(
                selected = vm.activeCategory == "all",
                onClick = { vm.selectCategory("all") },
                label = { Text("全部($totalItems)") },
                leadingIcon = { Icon(Icons.Filled.Layers, null, Modifier.size(16.dp)) }
            )
            HotViewModel.FEED_CATEGORIES.forEach { c ->
                FilterChip(
                    selected = vm.activeCategory == c,
                    onClick = { vm.selectCategory(c) },
                    label = { Text("${labels[c] ?: c}(${vm.feeds[c]?.size ?: 0})") },
                    leadingIcon = { Icon(categoryIcon(c), null, Modifier.size(16.dp)) }
                )
            }
        }

        PullToRefreshBox(
            isRefreshing = vm.refreshing,
            onRefresh = { vm.refresh(fromPull = true) },
            modifier = Modifier.fillMaxSize()
        ) {
            when {
                vm.loading && vm.feeds.isEmpty() && vm.overview == null -> HotFeedSkeleton()
                vm.error != null && vm.feeds.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                totalItems == 0 -> EmptyBox("暂时没有采集到数据")
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        visible.forEach { category ->
                            val categoryItems = vm.feeds[category] ?: emptyList()
                            if (categoryItems.isEmpty()) return@forEach
                            item(key = "header_$category") {
                                Row(
                                    Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(categoryIcon(category), null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                                    Text(labels[category] ?: category, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Text("(${categoryItems.size})", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            items(categoryItems, key = { "${category}_${it.itemKey}" }) { item ->
                                HotItemCard(item) { onOpenUrl(item.url, item.titleZh ?: item.title) }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun categoryIcon(category: String) = when (category) {
    "github" -> Icons.Filled.Code
    "hf" -> Icons.Filled.AutoAwesome
    "ai-news" -> Icons.Filled.Article
    else -> Icons.Filled.Layers
}

@Composable
private fun HotItemCard(item: HotFeedItem, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item.rank?.let { rank ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        contentColor = MaterialTheme.colorScheme.primary
                    ) {
                        Text(
                            rank.toString(),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    item.titleZh?.takeIf { it.isNotBlank() } ?: item.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Icon(Icons.Filled.OpenInNew, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.outline)
            }

            item.summaryZh?.takeIf { it.isNotBlank() }?.let { summary ->
                Text(
                    summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item.author?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                item.tags?.takeIf { it.isNotBlank() }?.let { tags ->
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                        contentColor = MaterialTheme.colorScheme.primary
                    ) {
                        Text(tags, style = MaterialTheme.typography.labelSmall, maxLines = 1, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                    }
                }
                Spacer(Modifier.weight(1f))
                formatScore(item.score)?.let { score ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Icon(Icons.Filled.LocalFireDepartment, null, Modifier.size(13.dp), tint = MaterialTheme.colorScheme.primary)
                        Text(score, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    }
                }
                val time = formatRelative(item.publishedAt ?: item.lastSeenAt)
                if (time.isNotBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Icon(Icons.Filled.Schedule, null, Modifier.size(12.dp), tint = MaterialTheme.colorScheme.outline)
                        Text(time, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    }
                }
            }
        }
    }
}

@Composable
private fun HotFeedSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        SkeletonBox(Modifier.width(120.dp).height(18.dp), RoundedCornerShape(4.dp))
        repeat(4) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SkeletonBox(Modifier.fillMaxWidth(0.9f).height(15.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.6f).height(15.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.8f).height(11.dp), RoundedCornerShape(4.dp))
                }
            }
        }
    }
}

// =====================================================================
// 榜单
// =====================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LeaderboardTab(vm: HotViewModel, onOpenUrl: (String, String) -> Unit) {
    Column(Modifier.fillMaxSize()) {
        // 模态 chips
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            HotViewModel.MODALITIES.forEach { m ->
                val count = vm.leaderboards[m]?.rows?.size ?: 0
                FilterChip(
                    selected = vm.modality == m,
                    onClick = { vm.selectModality(m) },
                    label = { Text(if (count > 0) "${MODALITY_LABELS[m] ?: m}($count)" else MODALITY_LABELS[m] ?: m) }
                )
            }
        }

        PullToRefreshBox(
            isRefreshing = vm.refreshing || vm.leaderboardsLoading,
            onRefresh = {
                vm.refresh(fromPull = true)
                vm.reloadLeaderboards()
            },
            modifier = Modifier.fillMaxSize()
        ) {
            val board = vm.leaderboards[vm.modality]
            // 每个模态独立列表状态：切换领域时从头开始，避免带着旧滚动位置跳到同名模型
            val listState = remember(vm.modality) { LazyListState() }
            when {
                vm.leaderboardsLoading && board == null -> LeaderboardSkeleton()
                board == null || board.rows.isEmpty() -> EmptyBox("暂无榜单数据")
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(top = 2.dp, bottom = 16.dp)
                    ) {
                        itemsIndexed(board.rows, key = { _, row -> row.modelKey }) { index, row ->
                            LeaderboardRow(row, index + 1, board.benchmarks, onOpenUrl)
                            HorizontalDivider(
                                Modifier.padding(start = 14.dp, end = 14.dp),
                                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                            )
                        }
                        item(key = "benchmark_note") {
                            Text(
                                "榜单口径不同（Elo / 百分比 / 归一化指数）不可直接横向比较，同名榜单内排名才有意义。" +
                                    "共 ${vm.benchmarks.size} 个榜单口径。",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                            )
                        }
                        item(key = "trend") {
                            TrendSection(vm.trend, vm.trendLoading)
                        }
                    }
                }
            }
        }
    }
}

/**
 * 榜单行（高密度）：排名/变化 + 模型名 + 开源/链接 + 厂商·价格·上下文 + 各榜单分数。
 * 用细分割线分隔而非大卡片，单屏可见更多模型。
 */
@Composable
private fun LeaderboardRow(
    row: ModelBenchmarkRow,
    fallbackRank: Int,
    benchmarks: List<BenchmarkMeta>,
    onOpenUrl: (String, String) -> Unit
) {
    val link = row.link?.takeIf { it.isNotBlank() }
    val present = benchmarks.filter { row.scores[it.key] != null }
    Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                (row.rank ?: fallbackRank).toString(),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            row.rankChange?.takeIf { it != 0 }?.let { change ->
                Text(
                    if (change > 0) "↑$change" else "↓${-change}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (change > 0) Color(0xFF16A34A) else Color(0xFFEF4444)
                )
            }
            Text(
                row.displayName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = if (link != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .weight(1f)
                    .then(if (link != null) Modifier.clickable { onOpenUrl(link, row.displayName) } else Modifier)
            )
            if (row.openWeights == true) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    Text("开源", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                }
            }
            if (link != null) {
                Icon(
                    Icons.Filled.OpenInNew, "打开模型链接",
                    tint = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(14.dp).clickable { onOpenUrl(link, row.displayName) }
                )
            }
        }
        val meta = listOfNotNull(
            row.vendor?.takeIf { it.isNotBlank() },
            "价 ${formatPrice(row.inputPrice)}/${formatPrice(row.outputPrice)}",
            "上下文 ${formatContext(row.contextWindow)}"
        ).joinToString(" · ")
        Text(
            meta,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 2.dp)
        )
        if (present.isNotEmpty()) {
            Text(
                present.joinToString(" · ") { "${it.name} ${formatBenchmarkValue(row.scores[it.key], it.unit)}" },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun TrendSection(trend: LeaderboardTrend?, loading: Boolean) {
    Column(Modifier.fillMaxWidth().padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Filled.TrendingUp, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
            Text("近 30 天分数趋势（主榜前 5）", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        }
        when {
            loading -> SkeletonBox(Modifier.fillMaxWidth().height(160.dp), RoundedCornerShape(8.dp))
            trend == null || trend.series.isEmpty() -> Text(
                "暂无历史趋势数据（榜单快照需连续采集后逐步积累）",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline
            )
            else -> {
                TrendLegend(trend)
                LineChart(trend, Modifier.fillMaxWidth().height(180.dp))
            }
        }
    }
}

@Composable
private fun TrendLegend(trend: LeaderboardTrend) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        trend.series.forEachIndexed { i, series ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(Modifier.size(8.dp).background(CHART_PALETTE[i % CHART_PALETTE.size], RoundedCornerShape(2.dp)))
                Text(series.label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
        }
    }
}

/** 轻量折线图（Compose Canvas 手绘，无第三方图表依赖） */
@Composable
private fun LineChart(trend: LeaderboardTrend, modifier: Modifier = Modifier) {
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
    val dates = remember(trend) {
        trend.series.flatMap { it.points.map { p -> p.date } }.distinct().sorted()
    }
    val scores = remember(trend) { trend.series.flatMap { it.points.mapNotNull { p -> p.score } } }
    val minV = scores.minOrNull() ?: 0.0
    val maxV = scores.maxOrNull() ?: 1.0

    if (dates.size < 2 || scores.isEmpty()) {
        Text("历史数据点不足", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        return
    }

    Canvas(modifier) {
        val pad = 10.dp.toPx()
        val w = size.width - pad * 2
        val h = size.height - pad * 2
        drawLine(gridColor, Offset(pad, pad), Offset(pad, pad + h), strokeWidth = 1.dp.toPx())
        drawLine(gridColor, Offset(pad, pad + h), Offset(pad + w, pad + h), strokeWidth = 1.dp.toPx())

        val span = (maxV - minV).takeIf { it > 0.0 } ?: 1.0
        trend.series.forEachIndexed { i, series ->
            val color = CHART_PALETTE[i % CHART_PALETTE.size]
            var prev: Offset? = null
            series.points.forEach { p ->
                val score = p.score ?: return@forEach
                val idx = dates.indexOf(p.date)
                if (idx < 0) return@forEach
                val x = pad + w * idx / (dates.size - 1).toFloat()
                val y = pad + h * (1f - ((score - minV) / span).toFloat())
                val cur = Offset(x, y)
                prev?.let { drawLine(color, it, cur, strokeWidth = 2.dp.toPx(), cap = StrokeCap.Round) }
                drawCircle(color, radius = 2.5.dp.toPx(), center = cur)
                prev = cur
            }
        }
    }
}

@Composable
private fun LeaderboardSkeleton() {
    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(5) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SkeletonBox(Modifier.fillMaxWidth(0.5f).height(16.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.75f).height(11.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.9f).height(11.dp), RoundedCornerShape(4.dp))
                }
            }
        }
    }
}

// =====================================================================
// 对比
// =====================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CompareTab(vm: HotViewModel) {
    val context = LocalContext.current
    var pickerOpen by remember { mutableStateOf(false) }
    val compare = vm.compare

    Column(Modifier.fillMaxSize()) {
        // 紧凑工具栏：不占空间，让结果区从一开始就是页面主体
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = { pickerOpen = true },
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Icon(Icons.Filled.Add, null, Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("添加模型", style = MaterialTheme.typography.labelMedium)
            }
            if (vm.comparing) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
            Spacer(Modifier.weight(1f))
            if (compare != null && compare.models.isNotEmpty()) {
                TextButton(onClick = { shareCompareUrl(context, vm.selected.map { it.modelKey }) }) {
                    Icon(Icons.Filled.Share, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("分享", style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        // 已选模型（紧凑 chips）
        if (vm.selected.isNotEmpty()) {
            FlowRow(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                vm.selected.forEachIndexed { i, m ->
                    val color = CHART_PALETTE[i % CHART_PALETTE.size]
                    Surface(shape = RoundedCornerShape(7.dp), color = color.copy(alpha = 0.12f), contentColor = color) {
                        Row(
                            Modifier.padding(start = 9.dp, end = 3.dp, top = 3.dp, bottom = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Text(m.displayName, style = MaterialTheme.typography.labelMedium, maxLines = 1)
                            Icon(
                                Icons.Filled.Close, "移除",
                                modifier = Modifier.size(14.dp).clickable { vm.removeModel(m.modelKey) }
                            )
                        }
                    }
                }
            }
        }

        // 结果区（页面主体）
        Box(Modifier.weight(1f)) {
            if (compare != null && compare.models.isNotEmpty()) {
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CompareTable(compare)
                    Text(
                        "提示：不同榜单口径（Elo / 百分比 / 归一化指数）不可直接比较；表中高亮为该指标下的最优值。",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                    if (vm.sources.isNotEmpty()) {
                        Text(
                            "数据来源：" + vm.sources.joinToString(" · ") { it.displayName.ifBlank { it.sourceKey } },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            } else {
                Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Filled.Layers, null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.outline)
                    Text(
                        "选择 2–${HotViewModel.MAX_COMPARE} 个模型开始对比",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 10.dp)
                    )
                    Text(
                        "可按榜单、按公司或搜索添加",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                    OutlinedButton(onClick = { pickerOpen = true }, modifier = Modifier.padding(top = 14.dp)) {
                        Icon(Icons.Filled.Add, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("添加模型")
                    }
                }
            }
        }
    }

    if (pickerOpen) {
        ModelPickerSheet(vm = vm, onDismiss = { pickerOpen = false })
    }
}

/** 模型选择器（底部弹层）：按榜单 / 按公司 / 搜索，数据全部来自 /hot/leaderboards + /hot/models，无写死名单 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModelPickerSheet(vm: HotViewModel, onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var pickerModality by rememberSaveable { mutableStateOf("text") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.85f)) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "添加模型",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    "已选 ${vm.selected.size}/${HotViewModel.MAX_COMPARE}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
            TabRow(selectedTabIndex = tab, containerColor = MaterialTheme.colorScheme.surface) {
                listOf("按榜单", "按公司", "搜索").forEachIndexed { i, label ->
                    Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label, style = MaterialTheme.typography.labelLarge) })
                }
            }
            when (tab) {
                0 -> LeaderboardPicker(vm, pickerModality, { pickerModality = it }, Modifier.weight(1f))
                1 -> VendorPicker(vm, Modifier.weight(1f))
                else -> SearchPicker(vm, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun LeaderboardPicker(
    vm: HotViewModel,
    modality: String,
    onModality: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val rows = vm.leaderboards[modality]?.rows ?: emptyList()
    Column(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            HotViewModel.MODALITIES.forEach { m ->
                FilterChip(selected = modality == m, onClick = { onModality(m) }, label = { Text(MODALITY_LABELS[m] ?: m) })
            }
        }
        if (rows.isEmpty()) {
            Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Text(
                    if (vm.leaderboardsLoading) "榜单加载中…" else "暂无该榜单模型",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        } else {
            LazyColumn(Modifier.fillMaxWidth().weight(1f)) {
                items(rows, key = { it.modelKey }) { row ->
                    PickerModelRow(row, vm.selected.any { it.modelKey == row.modelKey }) { vm.toggleModel(row.toSelected()) }
                }
            }
        }
    }
}

@Composable
private fun VendorPicker(vm: HotViewModel, modifier: Modifier = Modifier) {
    var filter by remember { mutableStateOf("") }
    val vendors = remember(vm.vendors, filter) {
        val q = filter.trim().lowercase()
        if (q.isEmpty()) vm.vendors else vm.vendors.filter { it.label.lowercase().contains(q) }
    }
    // 首次进入自动选第一个（后端已把重点厂商排在前）
    LaunchedEffect(vm.vendors) {
        if (vm.pickerVendor == null && vm.vendors.isNotEmpty()) vm.selectVendor(vm.vendors.first().key)
    }
    Column(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            SearchField(
                value = filter,
                onValueChange = { filter = it },
                placeholder = "筛选公司…",
                modifier = Modifier.weight(1f)
            )
        }
        SortChips(vm)
        if (vendors.isEmpty()) {
            Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Text("未找到相关公司", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            }
        } else {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                vendors.forEach { v ->
                    FilterChip(
                        selected = vm.pickerVendor == v.key,
                        onClick = { vm.selectVendor(v.key) },
                        label = {
                            Text(
                                (if (v.focused) "★ " else "") + "${v.label}(${v.modelCount})",
                                maxLines = 1
                            )
                        }
                    )
                }
            }
            when {
                vm.pickerLoading -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                }
                vm.vendorModelList.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text("该公司暂无模型", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                }
                else -> LazyColumn(Modifier.fillMaxWidth().weight(1f)) {
                    items(vm.vendorModelList, key = { it.modelKey }) { row ->
                        PickerModelRow(row, vm.selected.any { it.modelKey == row.modelKey }) { vm.toggleModel(row.toSelected()) }
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchPicker(vm: HotViewModel, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SearchField(
                value = vm.modelQuery,
                onValueChange = { vm.onModelQueryChange(it) },
                placeholder = "搜索模型名称或厂商…",
                modifier = Modifier.weight(1f)
            )
            if (vm.searching) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
        }
        SortChips(vm)
        if (vm.modelResults.isEmpty()) {
            Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Text(
                    if (vm.modelQuery.isBlank()) "输入名称或厂商搜索任意模型" else "未找到相关模型",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        } else {
            LazyColumn(Modifier.fillMaxWidth().weight(1f)) {
                items(vm.modelResults, key = { it.modelKey }) { row ->
                    PickerModelRow(row, vm.selected.any { it.modelKey == row.modelKey }) { vm.toggleModel(row.toSelected()) }
                }
            }
        }
    }
}

@Composable
private fun SortChips(vm: HotViewModel) {
    val options = listOf("newest" to "最新", "name" to "名称", "price" to "价格", "context" to "上下文")
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("排序", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        options.forEach { (key, label) ->
            FilterChip(selected = vm.modelSort == key, onClick = { vm.chooseSort(key) }, label = { Text(label) })
        }
    }
}

@Composable
private fun PickerModelRow(row: ModelBenchmarkRow, selected: Boolean, onToggle: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onToggle() }.padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Column(Modifier.weight(1f)) {
            Text(row.displayName, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (!row.vendor.isNullOrBlank()) {
                Text(row.vendor, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Icon(
            if (selected) Icons.Filled.Check else Icons.Filled.Add,
            if (selected) "已选" else "添加",
            Modifier.size(20.dp),
            tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.10f))
}

private fun ModelBenchmarkRow.toSelected() = SelectedModel(modelKey, displayName, vendor)

@Composable
private fun CompareTable(compare: ModelCompare) {
    val models = compare.models
    val labelWidth = 84.dp
    val colWidth = 118.dp
    val totalWidth = labelWidth + colWidth * models.size

    Column(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .padding(vertical = 4.dp)
    ) {
        // 表头
        Row(Modifier.width(totalWidth).padding(vertical = 6.dp)) {
            TableCell("指标", labelWidth, header = true)
            models.forEachIndexed { i, m ->
                TableCell(m.displayName, colWidth, header = true, color = CHART_PALETTE[i % CHART_PALETTE.size])
            }
        }
        TableDivider(totalWidth)

        // 各榜单行（只保留至少一个模型有分的口径，避免整片「—」；高亮最优）
        compare.benchmarks.filter { b -> models.any { it.scores[b.key] != null } }.forEach { b ->
            val allValues = models.map { it.scores[b.key] }
            Row(Modifier.width(totalWidth)) {
                TableCell("${b.name}(${b.unit})", labelWidth, muted = true)
                models.forEach { m ->
                    val v = m.scores[b.key]
                    val best = v != null && isBest(b, v, allValues)
                    TableCell(formatBenchmarkValue(v, b.unit), colWidth, best = best)
                }
            }
            TableDivider(totalWidth)
        }

        // 价格 / 上下文 / 开源 / 发布时间
        Row(Modifier.width(totalWidth)) {
            TableCell("输入价/输出价", labelWidth, muted = true)
            models.forEach { m ->
                TableCell(
                    if (m.inputPrice == null && m.outputPrice == null) "—"
                    else "${formatPrice(m.inputPrice)}/${formatPrice(m.outputPrice)}",
                    colWidth
                )
            }
        }
        TableDivider(totalWidth)
        Row(Modifier.width(totalWidth)) {
            TableCell("上下文窗口", labelWidth, muted = true)
            models.forEach { m -> TableCell(formatContext(m.contextWindow), colWidth) }
        }
        TableDivider(totalWidth)
        Row(Modifier.width(totalWidth)) {
            TableCell("权重开放", labelWidth, muted = true)
            models.forEach { m ->
                TableCell(if (m.openWeights == null) "—" else if (m.openWeights) "开源" else "闭源", colWidth)
            }
        }
        TableDivider(totalWidth)
        Row(Modifier.width(totalWidth)) {
            TableCell("发布时间", labelWidth, muted = true)
            models.forEach { m -> TableCell(formatDate(m.releaseDate).ifBlank { "—" }, colWidth) }
        }
    }
}

@Composable
private fun TableCell(
    text: String,
    width: Dp,
    header: Boolean = false,
    muted: Boolean = false,
    best: Boolean = false,
    color: Color = Color.Unspecified
) {
    val resolved = when {
        color != Color.Unspecified -> color
        muted -> MaterialTheme.colorScheme.onSurfaceVariant
        else -> MaterialTheme.colorScheme.onSurface
    }
    Text(
        text,
        modifier = Modifier.width(width).padding(horizontal = 8.dp, vertical = 8.dp),
        style = if (header) MaterialTheme.typography.labelMedium else MaterialTheme.typography.bodySmall,
        fontWeight = if (header || best) FontWeight.SemiBold else null,
        color = if (best) MaterialTheme.colorScheme.primary else resolved,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
private fun TableDivider(totalWidth: Dp) {
    HorizontalDivider(
        Modifier.width(totalWidth),
        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
    )
}

// =====================================================================
// 工具
// =====================================================================

private fun isBest(meta: BenchmarkMeta, value: Double, all: List<Double?>): Boolean {
    val numeric = all.filterNotNull()
    if (numeric.size < 2) return false
    val target = if (meta.higherIsBetter) numeric.max() else numeric.min()
    return value == target
}

/** 榜单分数格式化（按 unit）：elo 取整 / % 一位小数 / score 三位或一位 / 其余（index 等）一位小数 */
private fun formatBenchmarkValue(value: Double?, unit: String?): String {
    if (value == null) return "—"
    return when (unit) {
        "elo" -> value.roundToInt().toString()
        "%" -> "%.1f%%".format(value)
        "score" -> if (value <= 1) "%.3f".format(value) else "%.1f".format(value)
        else -> "%.1f".format(value)
    }
}

private fun formatScore(score: Double?): String? {
    if (score == null) return null
    return if (score >= 1000) "%.1fk".format(score / 1000) else score.roundToInt().toString()
}

private fun formatPrice(value: Double?): String {
    if (value == null) return "—"
    if (value == 0.0) return "免费"
    return if (value < 0.1) "$%.3f".format(value) else "$%.2f".format(value)
}

private fun formatContext(value: Int?): String {
    if (value == null) return "—"
    return if (value >= 1000) "${value / 1000}k" else value.toString()
}

/** 相对时间（对齐 web InsightClient.formatTime） */
private fun formatRelative(date: java.util.Date?): String {
    if (date == null) return ""
    val diff = System.currentTimeMillis() - date.time
    val minute = 60_000L
    val hour = 60 * minute
    val day = 24 * hour
    return when {
        diff < 0 -> formatDate(date)
        diff < hour -> "${max(1, (diff / minute).toInt())} 分钟前"
        diff < day -> "${diff / hour} 小时前"
        diff < 30 * day -> "${diff / day} 天前"
        else -> formatDate(date)
    }
}

/** 分享对比链接：与 web ComparePanel 一致的 URL（系统分享 Intent） */
private fun shareCompareUrl(context: Context, keys: List<String>) {
    if (keys.isEmpty()) return
    val encoded = keys.joinToString(",") { URLEncoder.encode(it, "UTF-8") }
    val url = "https://hanphone.cn/insight/?view=compare&models=$encoded"
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "模型对比 · 云林有风")
        putExtra(Intent.EXTRA_TEXT, "$url\n\n来自「云林有风」Android 客户端 · 热点")
    }
    context.startActivity(Intent.createChooser(send, "分享对比链接"))
}
