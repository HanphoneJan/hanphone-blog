package com.hanphone.blog.ui.admin

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.AdminCollectRun
import com.hanphone.blog.data.model.AdminRebuildSummary
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.util.formatDateTime

/**
 * 聚合数据：对标网页后台 `/admin/insight`。
 *
 * 手机端保留核心操作：手动采集（轮询到结束）、信源健康度、AI 摘要配置（启用/保存/测试）、
 * 采集记录（方式/结果/时间范围/关键词 + 分页）、模型归一重建（预演/执行）。
 */
@Composable
fun AdminInsightScreen(
    onBack: () -> Unit,
    vm: AdminInsightViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var confirmRebuild by remember { mutableStateOf(false) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "聚合数据",
        onBack = onBack,
        actions = {
            TextButton(onClick = vm::loadAll, enabled = !vm.loading) { Text("刷新") }
        }
    ) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {

            // ===== 采集状态 =====
            AdminGap(8)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("采集状态：", style = MaterialTheme.typography.bodyLarge)
                if (vm.loading && vm.sources.isEmpty()) {
                    Text("读取中…", style = MaterialTheme.typography.bodyLarge)
                } else {
                    AdminBadge(
                        if (vm.running || vm.collecting) "进行中" else "空闲",
                        if (vm.running || vm.collecting) MaterialTheme.colorScheme.secondary
                        else MaterialTheme.colorScheme.primary
                    )
                }
                if (vm.sources.isNotEmpty()) {
                    Text(
                        " · ${vm.healthyCount}/${vm.sources.size} 信源正常",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            AdminGap(6)
            Text(
                "触发后服务端后台采集 GitHub / Hugging Face / AI 要闻与模型榜单，完成后给订阅设备推送热点更新；定时任务每日 03:30 自动执行。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            AdminGap(10)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = vm::collect,
                    enabled = !vm.collecting && !vm.running
                ) {
                    if (vm.collecting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(15.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Text("采集中…", modifier = Modifier.padding(start = 6.dp))
                    } else {
                        Text("手动采集")
                    }
                }
                Text(
                    if (vm.collecting) "后台执行，完成后自动刷新" else "异步执行，可离开本页",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }

            // ===== 信源状态 =====
            AdminSectionTitle("信源状态", "共 ${vm.sources.size} 个")
            when {
                vm.loading && vm.sources.isEmpty() -> AdminLoading()
                vm.sources.isEmpty() -> AdminEmpty("暂无信源，先触发一次采集")
                else -> vm.sources.forEach { SourceRow(it) }
            }

            // ===== AI 摘要 =====
            AdminSectionTitle("AI 摘要配置", "OpenAI 兼容接口")
            val summary = vm.summary
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AdminBadge(
                    when {
                        summary == null -> "读取中"
                        !summary.toggleEnabled -> "已暂停"
                        summary.configured -> "已启用"
                        else -> "未配置"
                    },
                    when {
                        summary == null -> MaterialTheme.colorScheme.outline
                        !summary.toggleEnabled -> MaterialTheme.colorScheme.tertiary
                        summary.configured -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.outline
                    }
                )
                Text(
                    if (summary?.toggleEnabled != false) "采集时为英文热点生成中文摘要" else "暂停期间采集不调用 AI",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f).padding(start = 8.dp)
                )
                TextButton(
                    onClick = vm::toggleSummary,
                    enabled = summary != null && !vm.togglingSummary
                ) { Text(if (summary?.toggleEnabled != false) "暂停" else "启用") }
            }
            AdminGap(4)
            AdminField(vm.summaryBaseUrl, vm::updateSummaryBaseUrl, "接口地址（Base URL）", placeholder = "https://api.deepseek.com/v1")
            AdminGap(8)
            AdminField(vm.summaryModel, vm::updateSummaryModel, "模型", placeholder = "deepseek-chat")
            AdminGap(8)
            AdminField(
                vm.summaryApiKey,
                vm::updateSummaryApiKey,
                "API Key",
                placeholder = if (summary?.hasApiKey == true) "已配置，留空则不修改" else "sk-...",
                password = true
            )
            AdminGap(8)
            AdminField(
                vm.summaryHeaders,
                vm::updateSummaryHeaders,
                "自定义请求头（每行 Key: Value，可留空）",
                singleLine = false,
                minLines = 3,
                placeholder = "x-opencode-session: your-session-token"
            )
            AdminGap(10)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = vm::saveSummary, enabled = !vm.savingSummary) {
                    if (vm.savingSummary) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(15.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Text("保存中…", modifier = Modifier.padding(start = 6.dp))
                    } else {
                        Text("保存")
                    }
                }
                OutlinedButton(onClick = vm::testSummary, enabled = !vm.testingSummary) {
                    Text(if (vm.testingSummary) "测试中…" else "测试")
                }
            }
            vm.testResult?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (it.startsWith("成功")) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }

            // ===== 采集记录 =====
            AdminSectionTitle("采集记录", "共 ${vm.runTotal} 条")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                AdminChip("全部方式", vm.filterTrigger == "") { vm.setTrigger("") }
                AdminChip("手动", vm.filterTrigger == "MANUAL") { vm.setTrigger("MANUAL") }
                AdminChip("定时", vm.filterTrigger == "SCHEDULED") { vm.setTrigger("SCHEDULED") }
            }
            AdminGap(6)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                AdminChip("全部结果", vm.filterResult == "") { vm.setResult("") }
                AdminChip("成功", vm.filterResult == "success") { vm.setResult("success") }
                AdminChip("部分失败", vm.filterResult == "partial") { vm.setResult("partial") }
                AdminChip("失败", vm.filterResult == "failed") { vm.setResult("failed") }
            }
            AdminGap(6)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                AdminChip("近 7 天", vm.filterRange == "7") { vm.setRange("7") }
                AdminChip("近 30 天", vm.filterRange == "30") { vm.setRange("30") }
                AdminChip(if (vm.order == "newest") "时间倒序 ↓" else "时间正序 ↑", true) {
                    vm.updateOrder(if (vm.order == "newest") "oldest" else "newest")
                }
                TextButton(onClick = vm::resetRunFilters) {
                    Text("重置", style = MaterialTheme.typography.labelMedium)
                }
            }
            AdminGap(6)
            SearchField(
                value = vm.runKeyword,
                onValueChange = vm::searchRuns,
                placeholder = "搜索采集明细…"
            )
            AdminGap(6)
            when {
                vm.runsLoading && vm.runs.isEmpty() -> AdminLoading()
                vm.runs.isEmpty() -> AdminEmpty("没有匹配的采集记录")
                else -> {
                    vm.runs.forEach { run -> RunRow(run) }
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        TextButton(onClick = { vm.goRunPage(vm.runPage - 1) }, enabled = vm.runPage > 0) {
                            Text("上一页")
                        }
                        Text(
                            "第 ${vm.runPage + 1} / ${vm.runPages} 页",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        TextButton(
                            onClick = { vm.goRunPage(vm.runPage + 1) },
                            enabled = vm.runPage < vm.runPages - 1
                        ) { Text("下一页") }
                    }
                }
            }

            // ===== 模型归一重建 =====
            AdminSectionTitle("模型归一重建")
            Text(
                "按当前归一规则重算 canonical_key，合并历史重复模型实体（如 spacexai:xxx 与 xai:xxx）。" +
                    "建议先预演查看影响；执行会重指榜单 / 别名 / 价格并删除多余实体。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            AdminGap(10)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { vm.rebuild(true) }, enabled = !vm.rebuildBusy) {
                    Text(if (vm.rebuildBusy) "处理中…" else "预演")
                }
                Button(onClick = { confirmRebuild = true }, enabled = !vm.rebuildBusy) {
                    Text("执行重建")
                }
            }
            vm.rebuildSummary?.let { summaryResult ->
                AdminGap(10)
                RebuildSummaryBlock(summaryResult)
            }

            AdminGap(24)
        }
    }

    if (confirmRebuild) {
        AdminConfirmDialog(
            title = "执行模型归一重建",
            text = "将按当前归一规则合并重复模型实体，并重指榜单 / 别名 / 价格数据。该操作会修改数据库，建议先用「预演」确认影响。",
            confirmText = "执行",
            onConfirm = {
                vm.rebuild(false)
                confirmRebuild = false
            },
            onDismiss = { confirmRebuild = false }
        )
    }
}

@Composable
private fun SourceRow(source: HotSourceStatus) {
    val context = LocalContext.current
    Column(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = source.sourceUrl.isNotBlank()) {
                runCatching {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(source.sourceUrl)))
                }
            }
            .padding(vertical = 7.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    source.displayName.ifBlank { source.sourceKey },
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    listOfNotNull(
                        source.sourceKey,
                        "${source.itemCount ?: 0} 条",
                        source.lastSuccessAt?.let { "最后成功 ${formatDateTime(it)}" }
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
            when (source.lastStatus) {
                "SUCCESS" -> AdminBadge("正常", MaterialTheme.colorScheme.primary)
                "FAILED" -> AdminBadge("失败", MaterialTheme.colorScheme.error)
                else -> AdminBadge("未运行", MaterialTheme.colorScheme.outline)
            }
        }
        source.lastError?.takeIf { it.isNotBlank() }?.let {
            Text(
                it,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 3.dp)
            )
        }
    }
    AdminDivider()
}

@Composable
private fun RunRow(run: AdminCollectRun) {
    var expanded by remember(run.id) { mutableStateOf(false) }
    Column(
        Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .padding(vertical = 7.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                formatDateTime(run.startedAt).ifBlank { "—" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            AdminBadge(
                if (run.triggerType == "MANUAL") "手动" else "定时",
                MaterialTheme.colorScheme.secondary
            )
            Text(
                "${run.successCount}/${run.totalSources}",
                style = MaterialTheme.typography.labelMedium,
                color = if (run.failedCount > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(start = 8.dp)
            )
            if (run.failedCount > 0) {
                Text(
                    "失败 ${run.failedCount}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(start = 6.dp)
                )
            }
        }
        run.detail?.takeIf { it.isNotBlank() }?.let {
            Text(
                it,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = if (expanded) Int.MAX_VALUE else 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 3.dp)
            )
        }
    }
    AdminDivider()
}

@Composable
private fun RebuildSummaryBlock(summary: AdminRebuildSummary) {
    Column(Modifier.fillMaxWidth().padding(top = 2.dp)) {
        Text(
            (if (summary.dryRun) "预演结果" else "已执行") +
                " · 实体 ${summary.totalEntities} · 合并组 ${summary.groupsMerged} · " +
                "删除实体 ${summary.entitiesRemoved} · 变更 key ${summary.keysChanged}",
            style = MaterialTheme.typography.bodySmall,
            color = if (summary.dryRun) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary
        )
        summary.changes.take(10).forEach { change ->
            Column(Modifier.fillMaxWidth().padding(top = 6.dp)) {
                Text(
                    "${change.keptFrom} → ${change.newKey}",
                    style = MaterialTheme.typography.labelSmall,
                    fontFamily = FontFamily.Monospace
                )
                if (change.removed.isNotEmpty()) {
                    Text(
                        "并入：${change.removed.joinToString("、")}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        if (summary.changes.size > 10) {
            Text(
                "还有 ${summary.changes.size - 10} 组变更未显示",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
