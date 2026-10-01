package com.hanphone.blog.ui.docs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.ui.components.SearchField
import com.hanphone.blog.util.buildDocFileUrl

private val TYPE_PILLS = listOf(
    DOC_TYPE_ALL to "全部",
    ".docx" to "Word",
    ".pdf" to "PDF",
    ".md" to "MD",
    ".html" to "HTML"
)

/** 文件类型 → (颜色, 短标签)，对齐 web 的 typeColors/typeIcons */
private fun docTypeStyle(type: String): Pair<Color, String> = when (normalizeDocType(type)) {
    "docx" -> Color(0xFF2196F3) to "DOC"
    "pdf" -> Color(0xFFF44336) to "PDF"
    "md" -> Color(0xFF4CAF50) to "MD"
    "html", "htm" -> Color(0xFFFF9800) to "HTML"
    else -> Color(0xFF9E9E9E) to type.removePrefix(".").uppercase().ifBlank { "FILE" }
}

/** 归一化文件类型：去掉前缀点并小写（".HTML" → "html"） */
private fun normalizeDocType(type: String): String = type.removePrefix(".").lowercase()

/** 文库：文件夹浏览 + 名称搜索 + 类型筛选（对标 web /docs） */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocsScreen(
    onBack: () -> Unit,
    onOpenWebView: (url: String, title: String) -> Unit,
    onOpenMarkdown: (url: String, title: String) -> Unit
) {
    val vm: DocsViewModel = hiltViewModel()
    val uriHandler = LocalUriHandler.current
    val listState = rememberLazyListState()

    // 类型统计（全部/Word/PDF/MD/HTML 各计数）
    val typeStats = remember(vm.docs) { vm.docs.groupingBy { it.fileType }.eachCount() }

    fun openDoc(doc: Doc) {
        val url = buildDocFileUrl(doc.docNamespace, doc.filename)
        when (normalizeDocType(doc.fileType)) {
            "html", "htm" -> onOpenWebView(url, doc.title.ifBlank { doc.filename.substringBeforeLast('.') })
            "md" -> onOpenMarkdown(url, doc.title.ifBlank { doc.filename.substringBeforeLast('.') })
            else -> uriHandler.openUri(url) // pdf/docx 等交给系统打开/下载
        }
        vm.reportView(doc.docId)
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "文库", onBack = onBack)

        // 搜索框
        SearchField(
            value = vm.query,
            onValueChange = { vm.onQueryChange(it) },
            placeholder = "搜索文件…",
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp)
        )

        // 类型筛选 pills（含数量）
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TYPE_PILLS.forEach { (type, label) ->
                val count = if (type == DOC_TYPE_ALL) vm.docs.size else typeStats[type] ?: 0
                FilterChip(
                    selected = vm.selectedType == type,
                    onClick = { vm.onTypeChange(type) },
                    label = { Text("$label $count") }
                )
            }
        }

        // 面包屑（非搜索态且有层级时显示）
        if (!vm.isSearching && vm.currentPath.isNotEmpty()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "全部文档",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable { vm.navigateRoot() }
                )
                vm.currentPath.forEachIndexed { i, seg ->
                    Icon(
                        Icons.Filled.KeyboardArrowRight, null,
                        tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        seg,
                        style = MaterialTheme.typography.labelMedium,
                        color = if (i == vm.currentPath.lastIndex) MaterialTheme.colorScheme.onSurface
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        Box(Modifier.weight(1f)) {
            PullToRefreshBox(
                isRefreshing = vm.refreshing,
                onRefresh = { vm.refresh(fromPull = true) },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    vm.loading && vm.docs.isEmpty() -> RowListSkeleton(leading = 36.dp, contentPadding = 16.dp)
                    vm.error != null && vm.docs.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.refresh() })
                    vm.docs.isEmpty() -> EmptyBox("暂无文件")
                    vm.isSearching -> {
                        val files = vm.filteredFiles
                        if (files.isEmpty()) {
                            EmptyBox("未找到匹配的文件")
                        } else {
                            LazyColumn(state = listState, modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 4.dp)) {
                                items(files, key = { it.path }) { node ->
                                    val doc = node.doc ?: return@items
                                    FileRow(doc) { openDoc(doc) }
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                                }
                            }
                        }
                    }
                    else -> LazyColumn(state = listState, modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 4.dp)) {
                        val folders = vm.currentFolder.children.filter { it.isFolder }
                        val files = vm.currentFolder.children.filter { it.isFolder.not() }
                        if (folders.isEmpty() && files.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(vertical = 80.dp), contentAlignment = Alignment.Center) {
                                    Text("暂无文件", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                                }
                            }
                        }
                        folders.forEach { folder ->
                            item(key = "folder_${folder.path}") { FolderRow(folder.name, folder.fileCount) { vm.navigateTo(folder.path.split('/')) } }
                            item(key = "folder_div_${folder.path}") { HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)) }
                        }
                        files.forEach { node ->
                            val doc = node.doc ?: return@forEach
                            item(key = "doc_${doc.docId}") { FileRow(doc) { openDoc(doc) } }
                            item(key = "doc_div_${doc.docId}") { HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)) }
                        }
                    }
                }
            }
        }
    }
}

/** 文件夹行：📁 + 名称 + 文件数 → 进入文件夹 */
@Composable
private fun FolderRow(name: String, fileCount: Int, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.size(34.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text("📁", fontSize = 17.sp)
            }
        }
        Spacer(Modifier.width(12.dp))
        Text(name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text("$fileCount 篇", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        Icon(Icons.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    }
}

/** 文件行：彩色类型徽标 + 名称（含推荐星）+ 日期 → 按类型打开 */
@Composable
private fun FileRow(doc: Doc, onClick: () -> Unit) {
    val (color, label) = docTypeStyle(doc.fileType)
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(shape = RoundedCornerShape(6.dp), color = color.copy(alpha = 0.12f), contentColor = color, modifier = Modifier.size(34.dp)) {
            Box(contentAlignment = Alignment.Center) {
                Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    doc.filename.substringBeforeLast('.').ifBlank { doc.filename },
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (doc.recommend) {
                    Icon(Icons.Filled.Star, "推荐", tint = Color(0xFFFBBF24), modifier = Modifier.size(14.dp))
                }
            }
            if (doc.createTime.isNotBlank()) {
                Text(
                    doc.createTime.take(10),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}