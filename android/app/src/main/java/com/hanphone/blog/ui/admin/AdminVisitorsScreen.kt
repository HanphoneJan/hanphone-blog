package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.AdminVisitorIp
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.util.countryZh
import com.hanphone.blog.util.formatDateTime

/**
 * 访客明细：UV/PV 概览、IP 列表（搜索 / 排序 / 翻页）、清理全部访客数据。
 * 对应网页后台「站点概览」里的「访客 IP 分布（全球）」卡片。
 */
@Composable
fun AdminVisitorsScreen(
    onBack: () -> Unit,
    vm: AdminVisitorsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var confirmClear by remember { mutableStateOf(false) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "访客明细",
        onBack = onBack,
        actions = {
            TextButton(onClick = vm::refresh, enabled = !vm.loading) { Text("刷新") }
            TextButton(onClick = { confirmClear = true }) { Text("清理") }
        }
    ) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
            AdminSectionTitle("访客概览")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                VisitorStat("访客 IP（UV）", vm.overview.uv, Modifier.weight(1f))
                VisitorStat("访问次数（PV）", vm.overview.pv, Modifier.weight(1f))
                VisitorStat(
                    "未知区域",
                    vm.overview.unknownRegion,
                    Modifier.weight(1f),
                    trailing = "${vm.overview.unknownRegionPercent}%"
                )
            }
            Text(
                "按 IP 归并统计；区域来自 IP 归属地库，内网/保留地址会归为未知区域。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )

            AdminSectionTitle("IP 明细", "共 ${vm.total} 条")
            SearchField(
                value = vm.keyword,
                onValueChange = vm::search,
                placeholder = "搜索 IP / 国家 / 省份 / 城市",
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                AdminChip("最近访问", vm.sortBy == "lastVisitTime") { vm.setSort("lastVisitTime") }
                AdminChip("访问次数", vm.sortBy == "visitCount") { vm.setSort("visitCount") }
                TextButton(onClick = vm::toggleOrder) {
                    Text(if (vm.order == "desc") "降序 ↓" else "升序 ↑")
                }
            }
            AdminGap(4)

            when {
                vm.loading && vm.items.isEmpty() -> AdminLoading()
                vm.items.isEmpty() -> AdminEmpty("暂无访客 IP 数据")
                else -> {
                    vm.items.forEach { item -> VisitorRow(item) }
                    AdminGap(6)
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        TextButton(onClick = { vm.goPage(vm.page - 1) }, enabled = vm.page > 1) {
                            Text("上一页")
                        }
                        Text(
                            "第 ${vm.page} / ${vm.totalPages} 页",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        TextButton(
                            onClick = { vm.goPage(vm.page + 1) },
                            enabled = vm.page < vm.totalPages
                        ) { Text("下一页") }
                    }
                }
            }
            AdminGap(24)
        }
    }

    if (confirmClear) {
        AdminConfirmDialog(
            title = "清理访客数据",
            text = "将删除全部访客 IP 记录（UV/PV 与区域分布都会归零），此操作不可撤销。",
            confirmText = "确认清理",
            destructive = true,
            onConfirm = {
                vm.clearAll()
                confirmClear = false
            },
            onDismiss = { confirmClear = false }
        )
    }
}

@Composable
private fun VisitorStat(
    label: String,
    value: Long,
    modifier: Modifier = Modifier,
    trailing: String? = null
) {
    Column(
        modifier
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                value.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            if (trailing != null) {
                Text(
                    trailing,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 3.dp, bottom = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun VisitorRow(item: AdminVisitorIp) {
    val location = listOfNotNull(
        countryZh(item.country),
        item.province,
        item.city
    )
        .map { it.trim() }
        .filter { it.isNotEmpty() && it != "未知" }
        .joinToString(" · ")
        .ifBlank { "未知区域" }

    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                item.ip,
                style = MaterialTheme.typography.bodyMedium,
                fontFamily = FontFamily.Monospace
            )
            Text(
                location,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                "${item.visitCount} 次",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                formatDateTime(item.lastVisitTime).ifBlank { "—" },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
    AdminDivider()
}
