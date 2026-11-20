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
// 热点
// =====================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun FeedTab(vm: HotViewModel, onOpenUrl: (String, String) -> Unit) {
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

PullRefresh(vm, Modifier.fillMaxSize()) {
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
                    Text(
                        it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        // 不给 weight 的话，作者名一长就会把后面的来源标签量成 0dp
                        modifier = Modifier.weight(1f, fill = false)
                    )
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
