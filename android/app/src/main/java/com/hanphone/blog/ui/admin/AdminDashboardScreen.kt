package com.hanphone.blog.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hanphone.blog.data.model.AdminMonthly
import com.hanphone.blog.data.model.AdminStats
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.VerticalAxis
import com.patrykandpatrick.vico.compose.cartesian.Zoom
import com.patrykandpatrick.vico.compose.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.compose.cartesian.data.CartesianValueFormatter
import com.patrykandpatrick.vico.compose.cartesian.rememberVicoZoomState
import com.patrykandpatrick.vico.compose.cartesian.data.lineSeries
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart

/**
 * 站点概览：总量指标卡 + 按月趋势图（Vico）。
 *
 * 数据来源：`/admin/get*Count` 与 `/admin/get*ByMonth`。
 * 后者返回 "2024-01,12" 形式的字符串，解析放在仓库层（AdminRepository.monthly）。
 */
@Composable
fun AdminDashboardScreen(
    onBack: () -> Unit,
    vm: AdminDashboardViewModel = hiltViewModel()
) {
    val stats = vm.stats
    val monthly = vm.monthly

    AdminScaffold(title = "站点概览", onBack = onBack) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
            if (vm.loading && stats == AdminStats()) {
                AdminLoading()
            } else {
                AdminGap(8)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("文章", stats.blogCount, Modifier.weight(1f))
                    StatCard("阅读", stats.viewCount, Modifier.weight(1f))
                }
                AdminGap(10)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("评论", stats.commentCount, Modifier.weight(1f))
                    StatCard("点赞", stats.likeCount, Modifier.weight(1f))
                }

                AdminSectionTitle("月度趋势", "共 ${monthly.size} 个月")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
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
                    MonthlyChart(monthly)
                    AdminGap(4)
                    Text(
                        "最近 12 个月",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                AdminGap(24)
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: Long, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            formatCount(value),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 2.dp)
        )
    }
}

@Composable
private fun MonthlyChart(points: List<AdminMonthly>) {
    val modelProducer = remember { CartesianChartModelProducer() }
    // 后端按月倒序，图表按时间正序展示
    val ordered = remember(points) { points.reversed() }

    LaunchedEffect(ordered) {
        modelProducer.runTransaction {
            lineSeries {
                series(ordered.map { it.value })
            }
        }
    }

    Box(
        Modifier
            .fillMaxWidth()
            .height(190.dp)
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .padding(8.dp)
    ) {
        val labels = ordered.map { it.label }
        CartesianChartHost(
            chart = rememberCartesianChart(
                rememberLineCartesianLayer(),
                startAxis = VerticalAxis.rememberStart(),
                bottomAxis = HorizontalAxis.rememberBottom(
                    valueFormatter = CartesianValueFormatter { _, value, _ ->
                        // 标签形如 "2024-01"，横轴只显示「1月」
                        labels.getOrNull(value.toInt())
                            ?.substringAfter('-')
                            ?.toIntOrNull()
                            ?.let { "${it}月" }
                            ?: ""
                    }
                )
            ),
            modelProducer = modelProducer,
            // 默认缩放会裁掉一部分月份，这里按内容自适应，12 个点全部可见
            zoomState = rememberVicoZoomState(initialZoom = Zoom.Content),
            modifier = Modifier.fillMaxWidth().height(174.dp)
        )
    }
}

/** 大数字缩写：12345 → 1.2万 */
private fun formatCount(value: Long): String = when {
    value >= 100_000_000 -> "%.1f亿".format(value / 100_000_000.0)
    value >= 10_000 -> "%.1f万".format(value / 10_000.0)
    else -> value.toString()
}
