package com.hanphone.blog.ui.components

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.data.update.AppUpdateManager
import com.hanphone.blog.ui.MarkdownContent

/**
 * 更新相关弹窗（发现新版本 → 下载进度 → 安装 / 失败重试），挂在 App 根界面，
 * 手动「检查更新」与启动自动检查共用同一套 UI，不会两处各弹一个框。
 *
 * 安装确认仍由系统负责；首次需要「安装未知应用」授权，授权返回后自动继续安装。
 */
@Composable
fun UpdateDialogs() {
    val context = LocalContext.current
    val toast = rememberToast()
    val offer by AppUpdateManager.offer.collectAsState()
    val state by AppUpdateManager.state.collectAsState()

    // 「失败 → 重试」需要知道是哪个版本/地址（此时弹窗已关，offer 已消费）
    var lastOffer by remember { mutableStateOf<AppUpdateManager.UpdateInfo?>(null) }
    LaunchedEffect(offer) {
        offer?.let { lastOffer = it }
    }

    // 从「安装未知应用」设置页返回：有已下载的包且已授权，直接拉起系统安装器
    val installPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        val ready = AppUpdateManager.state.value as? AppUpdateManager.State.Ready
        if (ready != null && AppUpdateManager.canInstall(context)) {
            runCatching { AppUpdateManager.install(context, ready.file) }
                .onFailure { toast("无法启动安装器") }
            AppUpdateManager.reset()
        }
    }

    // 下载完成且已有权限：自动拉起系统安装器（安装确认仍由系统负责）
    LaunchedEffect(state) {
        val ready = state as? AppUpdateManager.State.Ready ?: return@LaunchedEffect
        if (AppUpdateManager.canInstall(context)) {
            runCatching { AppUpdateManager.install(context, ready.file) }
                .onFailure { toast("无法启动安装器") }
            AppUpdateManager.reset()
        }
    }

    // ===== 发现新版本 =====
    offer?.let { info ->
        AlertDialog(
            onDismissRequest = { AppUpdateManager.dismissOffer() },
            title = { Text("发现新版本 ${info.version}") },
            text = {
                // 注意修饰符顺序：heightIn 在外、verticalScroll 在内。
                // 反过来（先 scroll 再 heightIn）会把滚动内容的测量高度钉死在 420dp，
                // 滚动容器以为内容就这么高 → 滚不动，超出的更新说明直接被截断。
                Column(
                    Modifier
                        .heightIn(max = dialogTextMaxHeight())
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "当前版本 v${BuildConfig.VERSION_NAME}，可升级到 ${info.version}。",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    if (info.body.isNotBlank()) {
                        MarkdownContent(info.body)
                    } else {
                        Text(
                            "（该版本没有填写更新说明）",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    AppUpdateManager.dismissOffer()
                    AppUpdateManager.download(context, info.apkUrl, info.version)
                }) { Text("立即更新") }
            },
            dismissButton = {
                TextButton(onClick = { AppUpdateManager.dismissOffer() }) { Text("稍后") }
            }
        )
    }

    // ===== 下载 / 安装 =====
    when (val st = state) {
        is AppUpdateManager.State.Downloading -> {
            AlertDialog(
                onDismissRequest = { AppUpdateManager.cancel() },
                title = { Text("正在下载 ${st.version}") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        LinearProgressIndicator(
                            progress = { st.percent / 100f },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            buildString {
                                append("${st.percent}%")
                                append(" · ")
                                append(formatSize(st.downloaded))
                                if (st.total > 0) append(" / ${formatSize(st.total)}")
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "下载完成后会直接调起系统安装器，无需跳转浏览器。",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { AppUpdateManager.cancel() }) { Text("取消") }
                }
            )
        }

        is AppUpdateManager.State.Ready -> {
            // 已有权限时由 LaunchedEffect 直接安装；没有权限时引导去系统设置
            if (!AppUpdateManager.canInstall(context)) {
                AlertDialog(
                    onDismissRequest = { AppUpdateManager.reset() },
                    title = { Text("需要安装权限") },
                    text = {
                        Text("首次应用内更新需要在系统设置里允许「云林有风」安装应用。授权返回后会自动继续安装。")
                    },
                    confirmButton = {
                        TextButton(onClick = {
                            installPermissionLauncher.launch(
                                AppUpdateManager.installPermissionIntent(context)
                            )
                        }) { Text("去设置") }
                    },
                    dismissButton = {
                        TextButton(onClick = { AppUpdateManager.reset() }) { Text("取消") }
                    }
                )
            }
        }

        is AppUpdateManager.State.Failed -> {
            AlertDialog(
                onDismissRequest = { AppUpdateManager.reset() },
                title = { Text("下载失败") },
                text = { Text(st.message) },
                confirmButton = {
                    TextButton(onClick = {
                        val retry = lastOffer
                        if (retry != null) {
                            AppUpdateManager.download(context, retry.apkUrl, retry.version)
                        } else {
                            AppUpdateManager.reset()
                        }
                    }) { Text("重试") }
                },
                dismissButton = {
                    TextButton(onClick = { AppUpdateManager.reset() }) { Text("取消") }
                }
            )
        }

        else -> Unit
    }
}

/**
 * 弹窗正文的最大高度：按屏幕高度取一个上限（矮屏也不会顶到按钮），最多 320dp。
 * 更新说明一般几行就够，弹窗太大反而挡内容；配合 `heightIn(...).verticalScroll(...)` 的正确顺序，
 * 长内容仍可以滚动看全。
 */
@Composable
private fun dialogTextMaxHeight(): Dp {
    val screenHeight = LocalConfiguration.current.screenHeightDp.dp
    return minOf(320.dp, screenHeight * 0.45f)
}

/** 下载进度里的文件大小 */
private fun formatSize(bytes: Long): String = when {
    bytes >= 1024L * 1024L -> "%.1f MB".format(bytes / 1024.0 / 1024.0)
    bytes >= 1024L -> "%.0f KB".format(bytes / 1024.0)
    else -> "$bytes B"
}
