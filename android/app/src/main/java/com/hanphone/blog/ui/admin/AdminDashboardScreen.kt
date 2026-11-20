package com.hanphone.blog.ui.admin

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.ModeComment
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.AdminMonthly
import com.hanphone.blog.data.model.AdminStats
import com.hanphone.blog.data.model.AdminVisitorArea
import com.hanphone.blog.util.countryZh
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.VerticalAxis
import com.patrykandpatrick.vico.compose.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.compose.cartesian.data.CartesianValueFormatter
import com.patrykandpatrick.vico.compose.cartesian.data.lineSeries
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.common.ProvideVicoTheme
import com.patrykandpatrick.vico.compose.m3.common.rememberM3VicoTheme
import java.time.YearMonth
import kotlin.math.pow

/**
 * 站点概览：总量指标卡 + 按月趋势图（Vico）+ 标签/分类/访客区域分布。
 *
 * 数据来源：`/admin/get*Count`、`/admin/get*ByMonth`、`/admin/getFullTagListAndBlogNumber`、
 * `/admin/getFullTypeList`、`admin/visitor/` 系列接口。月度接口返回 "2024-01,12" 形式的字符串，
 * 解析放在仓库层（AdminRepository.monthly）。
 *
 * 图形颜色必须由 `ProvideVicoTheme(rememberM3VicoTheme())` 提供：Vico 默认主题的文字/线条是黑色，
 * 黑夜模式下坐标轴会变成黑字（2026-11 用户反馈）。
 */
@Composable
fun AdminDashboardScreen(
    onBack: () -> Unit,
    onOpenVisitors: () -> Unit,
    vm: AdminDashboardViewModel = hiltViewModel()
) {
    val stats = vm.stats
    val monthly = vm.monthly

    AdminScaffold(
        title = "站点概览",
        onBack = onBack,
        actions = { TextButton(onClick = vm::refresh, enabled = !vm.loading) { Text("刷新") } },
        refreshable = vm,
    ) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
            if (vm.loading && stats == AdminStats() && monthly.isEmpty()) {
                AdminLoading()
            } else {
                AdminGap(8)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        "文章", stats.blogCount, Icons.Filled.Article,
                        vm.metric == "blogs",
                        Modifier.weight(1f)
                    ) { vm.selectMetric("blogs") }
                    StatCard(
                        "阅读", stats.viewCount, Icons.Filled.Visibility,
                        vm.metric == "views",
                        Modifier.weight(1f)
                    ) { vm.selectMetric("views") }
                }
                AdminGap(10)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        "评论", stats.commentCount, Icons.Filled.ModeComment,
                        vm.metric == "comments",
                        Modifier.weight(1f)
                    ) { vm.selectMetric("comments") }
                    StatCard(
                        "点赞", stats.likeCount, Icons.Filled.Favorite,
                        vm.metric == "likes",
                        Modifier.weight(1f)
                    ) { vm.selectMetric("likes") }
                }

                val trend = remember(monthly) { trendMonths(monthly) }
                AdminSectionTitle("月度趋势", if (trend.isEmpty()) null else "${trend.size} 个月")
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
                ) {
                    vm.metrics.forEach { (key, label) ->
                        AdminChip(label, vm.metric == key) { vm.selectMetric(key) }
                    }
                }
                AdminGap(10)
                if (monthly.isEmpty()) {
                    Text(
                        if (vm.loading) "加载中…" else "暂无数据",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 24.dp)
                    )
                } else {
                    val visibleCount = 7
                    var offset by remember(trend) { mutableIntStateOf(0) }
                    val maxOffset = (trend.size - visibleCount).coerceAtLeast(0)
                    val clampedOffset = offset.coerceIn(0, maxOffset)
                    val end = trend.size - clampedOffset
                    val start = (end - visibleCount).coerceAtLeast(0)
                    val visible = trend.subList(start, end)

                    Box(Modifier.fillMaxWidth()) {
                        key(start, end) { MonthlyChart(visible) }
                        // Vico 的横向拖拽在嵌套竖向滚动里不生效，这里用覆盖层自己处理左右滑动
                        Box(
                            Modifier
                                .matchParentSize()
                                .pointerInput(trend.size, maxOffset) {
                                    var accumulated = 0f
                                    var shifted = false
                                    detectHorizontalDragGestures(
                                        onDragStart = {
                                            accumulated = 0f
                                            shifted = false
                                        },
                                        onDragEnd = {
                                            accumulated = 0f
                                            shifted = false
                                        },
                                        onDragCancel = {
                                            accumulated = 0f
                                            shifted = false
                                        },
                                        onHorizontalDrag = { change, dragAmount ->
                                            change.consume()
                                            accumulated += dragAmount
                                            val threshold = 90f
                                            // 一次手势只翻一个月，避免 800px 的滑动连翻 6 个月
                                            if (!shifted && accumulated > threshold && offset < maxOffset) {
                                                offset += 1
                                                shifted = true
                                            } else if (!shifted && accumulated < -threshold && offset > 0) {
                                                offset -= 1
                                                shifted = true
                                            }
                                        }
                                    )
                                }
                        )
                    }
                    if (maxOffset > 0) {
                        Row(
                            Modifier.fillMaxWidth().padding(top = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            TextButton(
                                onClick = { offset = (clampedOffset + 1).coerceAtMost(maxOffset) },
                                enabled = clampedOffset < maxOffset
                            ) { Text("‹ 更早") }
                            Text(
                                "${trend[start].label} ~ ${trend[end - 1].label}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            TextButton(
                                onClick = { offset = (clampedOffset - 1).coerceAtLeast(0) },
                                enabled = clampedOffset > 0
                            ) { Text("更近 ›") }
                        }
                    }
                }

                AdminSectionTitle("标签分布", if (vm.tags.isEmpty()) null else "共 ${vm.tags.size} 个")
                if (vm.tags.isEmpty()) {
                    DistributionEmpty(vm.loading)
                } else {
                    val max = vm.tags.maxOf { it.blogsNumber }.coerceAtLeast(1)
                    vm.tags.sortedByDescending { it.blogsNumber }.take(8).forEachIndexed { i, tag ->
                        DistributionBar(
                            name = tag.name,
                            count = tag.blogsNumber,
                            fraction = tag.blogsNumber.toFloat() / max,
                            color = distributionColor(i)
                        )
                    }
                }

                AdminSectionTitle("分类分布", if (vm.types.isEmpty()) null else "共 ${vm.types.size} 个")
                if (vm.types.isEmpty()) {
                    DistributionEmpty(vm.loading)
                } else {
                    val max = vm.types.maxOf { it.blogs.size }.coerceAtLeast(1)
                    vm.types.take(8).forEachIndexed { i, type ->
                        DistributionBar(
                            name = type.name,
                            count = type.blogs.size.toLong(),
                            fraction = type.blogs.size.toFloat() / max,
                            color = distributionColor(i)
                        )
                    }
                }

                AdminSectionTitle("访客区域", "按访客 IP 归属地")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminChip("国家", vm.areaLevel == "country") { vm.selectAreaLevel("country") }
                    AdminChip("省份", vm.areaLevel == "province") { vm.selectAreaLevel("province") }
                }
                AdminGap(8)
                val areas = vm.topAreas(8)
                if (areas.isEmpty()) {
                    DistributionEmpty(vm.loading)
                } else {
                    val max = areas.maxOf { it.visitorCount }.coerceAtLeast(1)
                    areas.forEachIndexed { i, area ->
                        DistributionBar(
                            name = if (vm.areaLevel == "country") {
                                countryZh(area.name) ?: area.name.ifBlank { "未知" }
                            } else {
                                area.name.ifBlank { "未知" }
                            },
                            count = area.visitorCount,
                            fraction = area.visitorCount.toFloat() / max,
                            color = distributionColor(i),
                            suffix = "位访客"
                        )
                    }
                }
                TextButton(onClick = onOpenVisitors, modifier = Modifier.padding(top = 2.dp)) {
                    Text("查看访客明细（IP / 清理）›")
                }

                AdminGap(24)
            }
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: Long,
    icon: ImageVector,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
        else MaterialTheme.colorScheme.surface,
        border = if (selected) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    icon,
                    null,
                    tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(15.dp)
                )
                Text(
                    label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 5.dp)
                )
            }
            Text(
                formatCount(value),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun MonthlyChart(points: List<AdminMonthly>) {
    val modelProducer = remember { CartesianChartModelProducer() }
    // 传入的是补全过的连续月份（缺失月 = 0），按时间正序显示
    val ordered = remember(points) { points.sortedBy { it.label } }
    // 月份基准：命中真实数据时直接用它的年份月份；越界索引（Vico 测宽用）按首/末月外推
    val firstMonth = remember(ordered) {
        ordered.firstOrNull()?.label?.let { runCatching { YearMonth.parse(it) }.getOrNull() }
    }
    val lastMonth = remember(ordered) {
        ordered.lastOrNull()?.label?.let { runCatching { YearMonth.parse(it) }.getOrNull() }
    }
    val monthLabel: (Int) -> String = { index ->
        val direct = ordered.getOrNull(index)?.label
            ?.let { runCatching { YearMonth.parse(it) }.getOrNull() }
        val month = direct ?: if (index < 0) {
            firstMonth?.plusMonths(index.toLong())
        } else {
            lastMonth?.plusMonths((index - ordered.lastIndex.coerceAtLeast(0)).toLong())
        }
        month?.let { "${it.monthValue}月" } ?: "—"
    }

    LaunchedEffect(ordered) {
        modelProducer.runTransaction {
            lineSeries {
                series(ordered.map { it.value })
            }
        }
    }

    ProvideVicoTheme(rememberM3VicoTheme()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(190.dp)
                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                .padding(8.dp)
        ) {
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberLineCartesianLayer(),
                    startAxis = VerticalAxis.rememberStart(
                        valueFormatter = CartesianValueFormatter { _, value, _ ->
                            axisValue(value)
                        },
                        // 计数类数据不要 0.4 / 1.6 这种刻度：按数据量级取 1/2/5×10ⁿ 的步长
                        itemPlacer = VerticalAxis.ItemPlacer.step(
                            { niceAxisStep(ordered.maxOfOrNull { it.value } ?: 0L) }
                        )
                    ),
                    bottomAxis = HorizontalAxis.rememberBottom(
                        valueFormatter = CartesianValueFormatter { _, value, _ ->
                            // 注意：Vico 3 的格式化器返回空串会直接抛 IllegalStateException（切换
                            // 「评论数」时只有几个月，ItemPlacer 的负偏移索引超出 labels 范围→闪退）。
                            // 所以永远返回非空文本，越界用首/末月外推、解析失败用「—」兜底。
                            monthLabel(value.toInt())
                        }
                    )
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(174.dp)
            )
        }
    }
}

/** 分布条：名称 + 横向条形 + 数值（手机宽度下比饼图/词云更容易读） */
@Composable
private fun DistributionBar(
    name: String,
    count: Long,
    fraction: Float,
    color: Color,
    suffix: String = "篇"
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            name,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(96.dp)
        )
        Box(
            Modifier
                .weight(1f)
                .height(8.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
        ) {
            if (count > 0) {
                Box(
                    Modifier
                        .fillMaxWidth(fraction.coerceIn(0.02f, 1f))
                        .height(8.dp)
                        .background(color, RoundedCornerShape(4.dp))
                )
            }
        }
        Text(
            "$count$suffix",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 8.dp)
        )
    }
}

@Composable
private fun DistributionEmpty(loading: Boolean) {
    Text(
        if (loading) "加载中…" else "暂无数据",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(vertical = 10.dp)
    )
}

/** 分类色板：与网页不同，手机端按序号取色即可（后端 color 字段是 "blue" 这类名字） */
@Composable
private fun distributionColor(index: Int): Color {
    val colors = listOf(
        MaterialTheme.colorScheme.primary,
        MaterialTheme.colorScheme.tertiary,
        MaterialTheme.colorScheme.secondary,
        Color(0xFFE8A33D),
        Color(0xFF7A6FF0),
        Color(0xFF1FA8A0),
        Color(0xFFE06C9F),
        Color(0xFF6B8E4E)
    )
    return colors[index % colors.size]
}

/**
 * 从最早有数据的月份到本月的连续序列，缺失月份补 0（最多 24 个月）。
 *
 * 后端每个指标只返回「有数据」的月份；直接按数组下标画图会把 1 月/2 月/6 月/7 月
 * 画成等距，看起来像连续增长（用户反馈「误导性很强」）。这里补齐缺口，横轴始终连续、
 * 缺口为 0；月份多于 7 个时图表默认只显示近 7 个月，可左右滑动查看更早。
 */
private fun trendMonths(points: List<AdminMonthly>): List<AdminMonthly> {
    if (points.isEmpty()) return emptyList()
    val values = points.associate { it.label to it.value }
    val end = YearMonth.now()
    val earliest = points.mapNotNull { runCatching { YearMonth.parse(it.label) }.getOrNull() }
        .minOrNull() ?: end.minusMonths(6)
    val start = maxOf(earliest, end.minusMonths(23))
    val size = java.time.temporal.ChronoUnit.MONTHS.between(start, end).toInt() + 1
    return (0 until size).map { offset ->
        val month = start.plusMonths(offset.toLong())
        AdminMonthly(month.toString(), values[month.toString()] ?: 0L)
    }
}

/** 大数字缩写：12345 → 1.2万 */
private fun formatCount(value: Long): String = when {    value >= 100_000_000 -> "%.1f亿".format(value / 100_000_000.0)
    value >= 10_000 -> "%.1f万".format(value / 10_000.0)
    else -> value.toString()
}

/** 纵轴刻度：整数原样显示，Vico 在 0..2 这种小范围会给出 0.5，保留一位小数避免多个重复刻度 */
private fun axisValue(value: Double): String {
    val rounded = kotlin.math.round(value * 10.0) / 10.0
    return when {
        rounded >= 10_000.0 -> formatCount(rounded.toLong())
        rounded == kotlin.math.floor(rounded) -> rounded.toLong().toString()
        else -> "%.1f".format(rounded)
    }
}

/**
 * 取一个「好看」的纵轴步长（1/2/5×10ⁿ），让刻度落在整数上。
 * 例如 max=2 → 1（0/1/2）、max=7305 → 2000、max=15000 → 5000。
 */
private fun niceAxisStep(max: Long): Double {
    if (max <= 0) return 1.0
    val rough = max / 4.0
    val power = 10.0.pow(kotlin.math.floor(kotlin.math.log10(rough)))
    val normalized = rough / power
    val nice = when {
        normalized <= 1.0 -> 1.0
        normalized <= 2.0 -> 2.0
        normalized <= 5.0 -> 5.0
        else -> 10.0
    }
    return (nice * power).coerceAtLeast(1.0)
}
