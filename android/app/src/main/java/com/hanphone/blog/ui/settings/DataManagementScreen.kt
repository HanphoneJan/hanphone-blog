package com.hanphone.blog.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.cache.ImageCaches.Feature
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.chat.ChatSocket
import com.hanphone.blog.ui.components.AppBackBar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * 数据管理：按功能分项显示缓存占用并一键清除。独立子页，由设置页入口进入。
 * 内容缓存（ContentStore）与图片缓存（ImageCaches，按功能分区）都逐项单独管理。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataManagementScreen(onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var cacheSizes by remember { mutableStateOf<Map<String, Long>>(emptyMap()) }
    var imageSizes by remember { mutableStateOf<Map<Feature, Long>>(emptyMap()) }
    var imageMemorySize by remember { mutableStateOf(0L) }
    var pendingClear by remember { mutableStateOf<PendingClear?>(null) }

    fun refreshSizes() {
        scope.launch {
            cacheSizes = ContentStore.cacheSizes()
            imageSizes = ImageCaches.diskSizes()
            imageMemorySize = ImageCaches.memorySize()
        }
    }

    LaunchedEffect(Unit) { refreshSizes() }

    fun onCacheCleared(files: List<String>, prefix: ((String) -> Boolean)?, resetMemory: () -> Unit) {
        scope.launch {
            withContext(Dispatchers.IO) {
                files.forEach { ContentStore.delete(it) }
                if (prefix != null) ContentStore.deleteWhere(prefix)
            }
            resetMemory()
            pendingClear = null
            refreshSizes()
        }
    }

    /** 该功能组占用字节数（精确文件名 + 前缀匹配） */
    fun featureSize(files: List<String>, prefix: String?): Long =
        cacheSizes.entries.filter { (name, _) ->
            files.contains(name) || (prefix != null && name.startsWith(prefix))
        }.sumOf { it.value }

    fun clearAllData() {
        scope.launch {
            withContext(Dispatchers.IO) { ContentStore.clearAll() }
            MemoryCache.resetAll()
            ChatSocket.clearLocalData()
            ImageCaches.clearAll()
            ImageCaches.clearMemory()
            pendingClear = null
            refreshSizes()
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "数据管理", onBack = onBack)
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(Modifier.padding(vertical = 6.dp)) {
                    CacheRow(
                        "首页 · 站点统计",
                        featureSize(
                            listOf("home_blogs.json", "site_stats.json", "visit_count.json", "types.json", "tags.json", "archive.json"),
                            "article_"
                        )
                    ) {
                        onCacheCleared(
                            listOf("home_blogs.json", "site_stats.json", "visit_count.json", "types.json", "tags.json", "archive.json"),
                            { it.startsWith("article_") }
                        ) {
                            MemoryCache.homeBlogs = null; MemoryCache.homePage = 1; MemoryCache.homeTotalPages = 1
                            MemoryCache.homeTypes = null; MemoryCache.homeTags = null; MemoryCache.archiveBlogs = null
                            MemoryCache.siteStats = null; MemoryCache.visitCount = null
                        }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("随笔 · 内容", featureSize(listOf("essay_first_page.json"), "essay_")) {
                        onCacheCleared(listOf("essay_first_page.json"), { it.startsWith("essay_") }) { MemoryCache.essayMoments = null }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("留言板", featureSize(listOf("board_messages.json"), null)) {
                        onCacheCleared(listOf("board_messages.json"), null) { MemoryCache.boardMessages = null }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("友链", featureSize(listOf("friend_links.json", "enrich_attempts.json"), null)) {
                        onCacheCleared(listOf("friend_links.json", "enrich_attempts.json"), null) { MemoryCache.friendLinks = null }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("项目", featureSize(listOf("projects.json"), null)) {
                        onCacheCleared(listOf("projects.json"), null) { MemoryCache.projects = null }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("文库", featureSize(listOf("docs.json"), "doc_")) {
                        onCacheCleared(listOf("docs.json"), { it.startsWith("doc_") }) { MemoryCache.docs = null }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("消息（聊天）", featureSize(listOf("chat_public.json", "chat_users.json"), "chat_private_")) {
                        onCacheCleared(listOf("chat_public.json", "chat_users.json"), { it.startsWith("chat_private_") }) {
                            ChatSocket.clearLocalData()
                        }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    CacheRow("热点聚合（洞察）", featureSize(emptyList(), "hot_")) {
                        onCacheCleared(emptyList(), { it.startsWith("hot_") }) {
                            MemoryCache.hotOverview = null
                            MemoryCache.hotFeeds = null
                            MemoryCache.hotSources = null
                            MemoryCache.hotBenchmarks = null
                            MemoryCache.hotLeaderboards = emptyMap()
                        }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))

                    // ===== 图片缓存（按功能/页面分区管理）=====
                    Feature.entries.forEach { f ->
                        CacheRow("图片 · ${f.label}", imageSizes[f] ?: 0L) {
                            scope.launch { ImageCaches.clear(f); refreshSizes() }
                        }
                        HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    }
                    CacheRow("图片 · 内存", imageMemorySize) {
                        scope.launch { ImageCaches.clearMemory(); refreshSizes() }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))

                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("清除全部", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text("清空本机全部缓存数据", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        TextButton(onClick = { pendingClear = PendingClear("全部", ::clearAllData) }) { Text("全部清除") }
                    }
                }
            }
        }
    }

    pendingClear?.let { p ->
        AlertDialog(
            onDismissRequest = { pendingClear = null },
            title = { Text("清除${p.label}数据") },
            text = { Text("确定清除本机的${p.label}缓存数据吗？仅影响本机，不会删除服务器上的数据。") },
            confirmButton = { TextButton(onClick = { p.run.invoke() }) { Text("清除") } },
            dismissButton = { TextButton(onClick = { pendingClear = null }) { Text("取消") } }
        )
    }
}

/** 数据管理里待确认的清除动作 */
private data class PendingClear(val label: String, val run: () -> Unit)

/** 数据管理行：功能名 + 占用 + 清除 */
@Composable
private fun CacheRow(label: String, sizeB: Long, onClear: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Text(formatBytes(sizeB), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        TextButton(onClick = onClear) { Text("清除") }
    }
}

private fun formatBytes(b: Long): String = when {
    b <= 0 -> "未缓存"
    b >= 1024L * 1024L -> "%.1f MB".format(b / (1024f * 1024f))
    else -> "%.1f KB".format(b / 1024f)
}