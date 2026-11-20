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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.unit.dp
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.R
import com.hanphone.blog.core.autoCheckUpdate
import com.hanphone.blog.core.setAutoCheckUpdate
import com.hanphone.blog.data.update.AppUpdateManager
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.SectionTitle
import kotlinx.coroutines.launch

/**
 * 设置页：入口列表（外观 / 数据管理 / 检查更新 + 启动检查开关）+ App 关于。
 * 功能详情拆分到独立子页（AppearanceScreen / DataManagementScreen），避免设置页过长。
 * 账号区并入「我的」页（去重）；版本号只在「检查更新」入口显示一次。
 * 更新弹窗（发现新版 / 下载进度 / 安装）挂在 App 根界面（ui/components/UpdateDialogs.kt），
 * 这里只负责发起检查和展示开关。
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
    val autoCheck by context.autoCheckUpdate.collectAsState(initial = true)

    fun checkUpdate() {
        if (checking) return
        scope.launch {
            checking = true
            val result = runCatching { AppUpdateManager.fetchLatest() }
            checking = false
            result.onSuccess { info ->
                if (info != null) AppUpdateManager.offerUpdate(info) else toast("已是最新版本")
            }.onFailure {
                toast("检查更新失败")
            }
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
                    HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    SettingsSwitchRow(
                        title = "启动时检查更新",
                        desc = "打开 App 时自动检查并提示新版本",
                        checked = autoCheck,
                        onCheckedChange = { scope.launch { context.setAutoCheckUpdate(it) } }
                    )
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

/** 设置开关行：整行可点，右侧 Switch */
@Composable
private fun SettingsSwitchRow(
    title: String,
    desc: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        Modifier.fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(desc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
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
