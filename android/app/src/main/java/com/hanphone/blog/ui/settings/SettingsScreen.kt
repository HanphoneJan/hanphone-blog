package com.hanphone.blog.ui.settings

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.R
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.SectionTitle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL
import java.nio.charset.Charset
import org.json.JSONObject

/**
 * 设置页：入口列表（外观 / 数据管理 / 检查更新）+ App 关于。
 * 功能详情拆分到独立子页（AppearanceScreen / DataManagementScreen），避免设置页过长。
 * 账号区并入「我的」页（去重）；版本号只在「检查更新」入口显示一次。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onOpenAppearance: () -> Unit,
    onOpenData: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val uriHandler = LocalUriHandler.current

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    // ===== 检查更新（GitHub Release）=====
    var checking by remember { mutableStateOf(false) }
    var updateInfo by remember { mutableStateOf<UpdateInfo?>(null) }

    fun checkUpdate() {
        if (checking || updateInfo != null) return
        scope.launch {
            checking = true
            try {
                val json = withContext(Dispatchers.IO) {
                    URL("https://api.github.com/repos/HanphoneJan/hanphone-blog/releases/latest")
                        .openStream().bufferedReader(Charset.forName("UTF-8")).use { it.readText() }
                }
                val obj = JSONObject(json)
                val tag = obj.optString("tag_name", "")
                val body = obj.optString("body", "")
                var apkUrl = ""
                val assets = obj.optJSONArray("assets")
                if (assets != null) {
                    for (i in 0 until assets.length()) {
                        val a = assets.getJSONObject(i)
                        if (a.optString("name", "").endsWith(".apk")) {
                            apkUrl = a.optString("browser_download_url", "")
                            break
                        }
                    }
                }
                if (tag.isNotBlank() && isNewerVersion(tag, BuildConfig.VERSION_NAME) && apkUrl.isNotBlank()) {
                    updateInfo = UpdateInfo(version = tag, body = body, apkUrl = apkUrl)
                } else {
                    toast("已是最新版本")
                }
            } catch (e: Exception) {
                toast("检查更新失败")
            }
            checking = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "设置", onBack = onBack)
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // ===== 设置项入口 =====
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column {
                    SettingsRow("外观", "主题 · 背景 · 模糊", onOpenAppearance)
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    SettingsRow("数据管理", "各页缓存占用与清理", onOpenData)
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    SettingsRow("检查更新", if (checking) "检查中…" else "当前 v${BuildConfig.VERSION_NAME}", onClick = ::checkUpdate)
                }
            }

            // ===== 关于 =====
            SectionTitle("关于")
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(Modifier.padding(vertical = 8.dp)) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_blog),
                            contentDescription = "云林有风图标",
                            modifier = Modifier.size(44.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        Column(Modifier.weight(1f)) {
                            Text("云林有风", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("原生 Kotlin + Jetpack Compose 博客客户端", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    AboutLinkRow("访问博客网站", "hanphone.cn") { uriHandler.openUri("https://hanphone.cn") }
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    AboutLinkRow("作者 GitHub", "HanphoneJan") { uriHandler.openUri("https://github.com/HanphoneJan") }
                }
            }
        }
    }

    // ===== 更新提示对话框 =====
    updateInfo?.let { info ->
        AlertDialog(
            onDismissRequest = { updateInfo = null },
            title = { Text("发现新版本 ${info.version}") },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("当前版本 v${BuildConfig.VERSION_NAME}，可升级到 ${info.version}。", style = MaterialTheme.typography.bodyMedium)
                    if (info.body.isNotBlank()) {
                        Text(
                            info.body,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 8,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    uriHandler.openUri(info.apkUrl) // 浏览器下载 APK 安装
                    updateInfo = null
                }) { Text("去更新") }
            },
            dismissButton = {
                TextButton(onClick = { updateInfo = null }) { Text("稍后") }
            }
        )
    }
}

/** 设置项入口行：标题 + 描述 + 箭头 */
@Composable
private fun SettingsRow(title: String, desc: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(desc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.outline)
    }
}

/** 关于区链接行：标题 + 副标题 + 箭头，点击外部打开 */
@Composable
private fun AboutLinkRow(title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(title, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        Icon(Icons.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.outline)
    }
}

/** 检查更新：GitHub 最新 Release 信息 */
private data class UpdateInfo(val version: String, val body: String, val apkUrl: String)

/** 语义化版本比较：latest 是否比 current 新（支持 v 前缀与可不齐的段） */
internal fun isNewerVersion(latest: String, current: String): Boolean {
    fun parse(v: String): List<Int> = v.trim().removePrefix("v").split('.').map { it.toIntOrNull() ?: 0 }
    val l = parse(latest)
    val c = parse(current)
    for (i in 0 until maxOf(l.size, c.size)) {
        val a = l.getOrElse(i) { 0 }
        val b = c.getOrElse(i) { 0 }
        if (a != b) return a > b
    }
    return false
}