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

/** 分类展示名（与 web InsightClient FALLBACK_LABELS 一致） */
internal val FEED_LABELS = mapOf(
    "github" to "GitHub 热门",
    "hf" to "Hugging Face 趋势",
    "ai-news" to "AI 要闻"
)

/** 模态展示名（与 web MODALITY_LABELS 一致） */
internal val MODALITY_LABELS = mapOf(
    "text" to "文本",
    "coding" to "代码",
    "agent" to "智能体",
    "embedding" to "Embedding",
    "image" to "生图",
    "video" to "生视频",
    "speech" to "语音"
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
            FilterChip(
                selected = vm.normalized,
                onClick = { vm.updateNormalized(!vm.normalized) },
                label = { Text("名称归一") },
                leadingIcon = {
                    Icon(
                        if (vm.normalized) Icons.Filled.Check else Icons.Filled.Close,
                        null,
                        Modifier.size(16.dp)
                    )
                }
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
