package com.hanphone.blog.ui.docs

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.hanphone.blog.ui.MarkdownContent
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.DetailSkeleton
import com.hanphone.blog.ui.components.ErrorBox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import java.nio.charset.Charset

/**
 * 文库 MD 预览：从文件服务拉取原文 → 去除 frontmatter → 用现有 Markdown 渲染器展示。
 * （对齐 web 由 marked 渲染 md 本地文档，docx/pdf 则走系统打开/下载。）
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocMarkdownScreen(url: String, title: String, onBack: () -> Unit) {
    var markdown by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    var attempt by remember { mutableIntStateOf(0) }

    LaunchedEffect(url, attempt) {
        loading = true
        error = null
        runCatching {
            withContext(Dispatchers.IO) {
                URL(url).openStream().bufferedReader(Charset.forName("UTF-8")).use { it.readText() }
            }
        }.onSuccess { markdown = it }.onFailure { error = it.message ?: "加载失败" }
        loading = false
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(
            title = title.ifBlank { "文档" },
            onBack = onBack,
            actions = {}
        )
        Box(Modifier.weight(1f)) {
            when {
                loading -> DetailSkeleton(Modifier.padding(top = 8.dp))
                error != null -> ErrorBox(error!!, onRetry = { attempt++ })
                markdown != null -> Column(
                    Modifier.fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    MarkdownContent(stripFrontmatter(markdown!!))
                }
                else -> Text("暂无内容", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(24.dp))
            }
        }
    }
}

/** 去除 Markdown 顶部 `--- frontmatter ---`（对齐 web parseFrontmatter） */
private fun stripFrontmatter(text: String): String {
    val match = Regex("^---\\r?\\n[\\s\\S]*?\\r?\\n---\\r?\\n?").find(text)
    return if (match != null) text.substring(match.range.last + 1) else text
}