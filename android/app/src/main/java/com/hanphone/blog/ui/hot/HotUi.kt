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

internal val CHART_PALETTE = listOf(
    Color(0xFF3B82F6), Color(0xFF10B981), Color(0xFFF59E0B),
    Color(0xFFEC4899), Color(0xFF8B5CF6), Color(0xFF06B6D4)
)

// =====================================================================
// 工具
// =====================================================================

internal fun isBest(meta: BenchmarkMeta, value: Double, all: List<Double?>): Boolean {
    val numeric = all.filterNotNull()
    if (numeric.size < 2) return false
    val target = if (meta.higherIsBetter) numeric.max() else numeric.min()
    return value == target
}

/** 榜单分数格式化（按 unit）：elo 取整 / % 一位小数 / score 三位或一位 / 其余（index 等）一位小数 */
internal fun formatBenchmarkValue(value: Double?, unit: String?): String {
    if (value == null) return "—"
    return when (unit) {
        "elo" -> value.roundToInt().toString()
        "%" -> "%.1f%%".format(value)
        "score" -> if (value <= 1) "%.3f".format(value) else "%.1f".format(value)
        else -> "%.1f".format(value)
    }
}

internal fun formatScore(score: Double?): String? {
    if (score == null) return null
    return if (score >= 1000) "%.1fk".format(score / 1000) else score.roundToInt().toString()
}

internal fun formatPrice(value: Double?): String {
    if (value == null) return "—"
    if (value == 0.0) return "免费"
    return if (value < 0.1) "$%.3f".format(value) else "$%.2f".format(value)
}

internal fun formatContext(value: Int?): String {
    if (value == null) return "—"
    return if (value >= 1000) "${value / 1000}k" else value.toString()
}

/** 相对时间（对齐 web InsightClient.formatTime） */
internal fun formatRelative(date: java.util.Date?): String {
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
internal fun shareCompareUrl(context: Context, keys: List<String>) {
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
