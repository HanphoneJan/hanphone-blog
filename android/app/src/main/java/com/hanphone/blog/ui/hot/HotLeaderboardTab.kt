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
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.ui.components.SkeletonBox
import com.hanphone.blog.util.formatDate
import java.net.URLEncoder
import kotlin.math.max
import kotlin.math.roundToInt

// =====================================================================
// 榜单
// =====================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun LeaderboardTab(vm: HotViewModel, onOpenUrl: (String, String) -> Unit) {
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

        PullRefresh(
            refreshing = vm.refreshing || vm.leaderboardsLoading,
            onRefresh = {
                vm.refresh()
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
