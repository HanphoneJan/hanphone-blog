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
// 对比
// =====================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun CompareTab(vm: HotViewModel) {
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
                            Text(
                                m.displayName,
                                style = MaterialTheme.typography.labelMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                // 模型名过长时会把这个删除 × 挤没，给它让位
                                modifier = Modifier.weight(1f, fill = false)
                            )
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
