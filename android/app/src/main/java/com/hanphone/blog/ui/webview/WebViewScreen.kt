package com.hanphone.blog.ui.webview

import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.docs.DOC_TEXT_TTL_MS
import com.hanphone.blog.ui.docs.docCacheKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import java.nio.charset.Charset

/**
 * 通用 WebView 页：App 内打开链接。
 *
 * 两种加载模式：
 * - loadAsHtml=false：直接 loadUrl（用于项目链接等普通网页）；
 * - loadAsHtml=true：先 fetch 文件原文再用 loadDataWithBaseURL 渲染（用于文库 .html 文档）。
 *   文件服务对文件类响应带 `Content-Disposition: attachment`，直接 loadUrl 会被当成下载
 *   而跳转 about:blank——必须取文本后注入渲染（与网页版 docLoader 的 fetch 做法一致）。
 *
 * 顶部进度条、返回键回退页面历史、右上角菜单可在浏览器打开；
 * 加载失败显示「重试 / 在浏览器打开」错误层。
 */
@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebViewScreen(
    url: String,
    title: String,
    onBack: () -> Unit,
    loadAsHtml: Boolean = false
) {
    val uriHandler = LocalUriHandler.current
    var progress by remember { mutableIntStateOf(0) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    var loadFailed by remember { mutableStateOf(false) }

    fun handleBack() {
        val wv = webView
        if (wv != null && wv.canGoBack()) wv.goBack() else onBack()
    }

    // 系统返回：先回退 WebView 内历史，退无可退再离开页面
    BackHandler { handleBack() }

    if (url.isBlank()) {
        EmptyBox("链接为空")
        return
    }

    // 实际加载：html 模式拉文本注入；否则直接 loadUrl
    val wv = webView
    LaunchedEffect(wv, url, loadAsHtml) {
        if (wv == null) return@LaunchedEffect
        loadFailed = false
        if (loadAsHtml) {
            val baseUrl = url.substringBeforeLast('/') + "/"
            // 磁盘缓存秒显（24h 内重复打开不再重新下载；避免每次进页白屏等 fetch）
            val cacheKey = docCacheKey(url, "html")
            val cached = ContentStore.readRawText(cacheKey, maxAgeMs = DOC_TEXT_TTL_MS)
            if (cached != null) {
                wv.loadDataWithBaseURL(baseUrl, cached, "text/html", "utf-8", null)
            } else {
                val html = runCatching {
                    withContext(Dispatchers.IO) {
                        URL(url).openStream().bufferedReader(Charset.forName("UTF-8")).use { it.readText() }
                    }
                }.getOrNull()
                if (html == null) {
                    loadFailed = true
                    progress = 0
                } else {
                    ContentStore.writeRawText(cacheKey, html)
                    // baseUrl 指向文件所在目录，页内相对资源/锚点可正常解析
                    wv.loadDataWithBaseURL(baseUrl, html, "text/html", "utf-8", null)
                }
            }
        } else {
            wv.loadUrl(url)
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(
            title = title.ifBlank { "网页" },
            onBack = { handleBack() },
            actions = {
                IconButton(onClick = { menuOpen = true }) { Icon(Icons.Filled.MoreVert, "更多") }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text = { Text("在浏览器打开") },
                        onClick = {
                            menuOpen = false
                            uriHandler.openUri(url)
                        }
                    )
                }
            }
        )

        if (progress in 1..99) {
            LinearProgressIndicator(
                progress = { progress / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary
            )
        }

        Box(Modifier.weight(1f)) {
            AndroidView(
                factory = { ctx ->
                    // 便于真机调试（仅 debug 包生效）
                    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
                    WebView(ctx).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.loadWithOverviewMode = true
                        settings.useWideViewPort = true
                        settings.builtInZoomControls = true
                        settings.displayZoomControls = false
                        webViewClient = object : WebViewClient() {
                            // 仅主框架失败才进入错误态（子资源错误忽略，避免误报）
                            override fun onReceivedError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                error: WebResourceError?
                            ) {
                                if (request?.isForMainFrame == true) {
                                    loadFailed = true
                                    progress = 0
                                }
                            }

                            override fun onReceivedHttpError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                errorResponse: android.webkit.WebResourceResponse?
                            ) {
                                if (request?.isForMainFrame == true) {
                                    loadFailed = true
                                    progress = 0
                                }
                            }
                        }
                        webChromeClient = object : WebChromeClient() {
                            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                                progress = newProgress
                            }
                        }
                    }.also { webView = it }
                },
                modifier = Modifier.fillMaxSize()
            )

            // 加载失败：错误层覆盖在 WebView 上方（保留实例，重试走重新加载）
            if (loadFailed) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Column(
                        Modifier.fillMaxSize().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Filled.Warning, null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )
                        Text("页面加载失败", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            url,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                        Row(
                            Modifier.padding(top = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(onClick = { loadFailed = false; webView?.reload() }) { Text("重试") }
                            TextButton(onClick = { uriHandler.openUri(url) }) { Text("在浏览器打开") }
                        }
                    }
                }
            }
        }
    }
}