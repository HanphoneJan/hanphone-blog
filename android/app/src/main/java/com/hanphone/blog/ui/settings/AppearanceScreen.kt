package com.hanphone.blog.ui.settings

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.hanphone.blog.core.backgroundBlur
import com.hanphone.blog.core.backgroundPath
import com.hanphone.blog.core.setBackgroundBlur
import com.hanphone.blog.core.setBackgroundPath
import com.hanphone.blog.core.setThemeMode
import com.hanphone.blog.core.themeMode
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.util.UrlRules
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

/**
 * 外观设置：主题（跟随系统/白日/黑夜）+ 自定义背景与模糊。独立子页，由设置页入口进入。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppearanceScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val themeMode by context.themeMode.collectAsState(initial = "system")
    val bgPath by context.backgroundPath.collectAsState(initial = null)
    val bgBlur by context.backgroundBlur.collectAsState(initial = 10)
    var blurNow by remember { mutableIntStateOf(10) }
    LaunchedEffect(bgBlur) { blurNow = bgBlur }

    val toast = rememberToast()

    var showUrlDialog by remember { mutableStateOf(false) }
    var bgUrlInput by remember { mutableStateOf("") }
    var bgUrlError by remember { mutableStateOf<String?>(null) }
    var downloadingBg by remember { mutableStateOf(false) }

    suspend fun copyToFile(uri: Uri): File? = withContext(Dispatchers.IO) {
        try {
            val dest = File(context.filesDir, "background.jpg")
            context.contentResolver.openInputStream(uri)?.use { input ->
                dest.outputStream().use { out -> input.copyTo(out) }
            }
            dest
        } catch (e: Exception) { null }
    }

    // 自定义背景：相册选图 → App 私有目录 → 全局背景层
    val bgPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            scope.launch {
                val file = copyToFile(it)
                if (file == null) { toast("图片读取失败"); return@launch }
                context.setBackgroundPath(file.absolutePath)
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "外观", onBack = onBack)
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
                    SettingLabel("主题")
                    ThemeRow("跟随系统", themeMode == "system") { scope.launch { context.setThemeMode("system") } }
                    ThemeRow("白日（浅色）", themeMode == "light") { scope.launch { context.setThemeMode("light") } }
                    ThemeRow("黑夜（深色）", themeMode == "dark") { scope.launch { context.setThemeMode("dark") } }

                    HorizontalDivider(Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    SettingLabel("自定义背景")
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                if (bgPath != null) "已启用（模糊 $bgBlur）" else "从相册选择，或从 URL 添加一张图片",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        OutlinedButton(onClick = { bgPicker.launch("image/*") }) {
                            Text(if (bgPath != null) "更换" else "选择")
                        }
                        TextButton(onClick = {
                            bgUrlError = null
                            showUrlDialog = true
                        }) { Text("从 URL 添加") }
                        if (bgPath != null) {
                            TextButton(onClick = { scope.launch { context.setBackgroundPath(null) } }) { Text("清除") }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("模糊", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Slider(
                            value = blurNow.toFloat(),
                            onValueChange = { blurNow = it.roundToInt() },
                            onValueChangeFinished = { scope.launch { context.setBackgroundBlur(blurNow) } },
                            valueRange = 0f..25f,
                            modifier = Modifier.weight(1f)
                        )
                        Text("$blurNow", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }

    if (showUrlDialog) {
        val urlError = bgUrlError
        AlertDialog(
            onDismissRequest = { if (!downloadingBg) showUrlDialog = false },
            title = { Text("从 URL 添加背景") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = bgUrlInput,
                        onValueChange = {
                            bgUrlInput = it
                            bgUrlError = null
                        },
                        label = { Text("图片地址") },
                        placeholder = { Text("https://example.com/background.jpg") },
                        singleLine = true,
                        isError = urlError != null,
                        supportingText = if (urlError != null) {
                            { Text(urlError) }
                        } else null,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        "仅支持 http/https，图片不超过 10MB；下载成功后替换当前背景。",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !downloadingBg && bgUrlInput.isNotBlank(),
                    onClick = {
                        val input = bgUrlInput.trim()
                        if (!UrlRules.isHttpUrl(input)) {
                            bgUrlError = "请输入 http:// 或 https:// 开头的图片地址"
                            return@TextButton
                        }
                        downloadingBg = true
                        scope.launch {
                            // 先写 background.tmp，成功才 rename 覆盖；失败保留原背景
                            val error = downloadBackground(context, input)
                            downloadingBg = false
                            if (error == null) {
                                showUrlDialog = false
                                context.setBackgroundPath(File(context.filesDir, "background.jpg").absolutePath)
                                toast("背景已更新")
                            } else {
                                bgUrlError = error
                                toast(error)
                            }
                        }
                    }
                ) {
                    if (downloadingBg) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    else Text("确定")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUrlDialog = false }, enabled = !downloadingBg) { Text("取消") }
            }
        )
    }
}

private const val MAX_BACKGROUND_BYTES = 10L * 1024 * 1024

/**
 * 下载远程背景到 App 私有目录，返回 null 表示成功、否则为错误文案。
 * 只接受 http(s)；超过 10MB 中止；先写 background.tmp，成功后 rename 覆盖 background.jpg，
 * 失败时删除半截临时文件、原背景不受影响（背景始终是本地文件，不上传）。
 */
private suspend fun downloadBackground(context: android.content.Context, url: String): String? =
    withContext(Dispatchers.IO) {
        val tmp = File(context.filesDir, "background.tmp")
        val dest = File(context.filesDir, "background.jpg")
        val client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()
        var error: String? = null
        try {
            client.newCall(Request.Builder().url(url).get().build()).execute().use { response ->
                val body = response.body
                when {
                    !response.isSuccessful -> error = "下载失败（HTTP ${response.code}）"
                    body == null -> error = "下载失败：响应为空"
                    body.contentLength() > MAX_BACKGROUND_BYTES -> error = "图片超过 10MB，请换一张"
                    else -> {
                        tmp.delete()
                        var total = 0L
                        body.byteStream().use { input ->
                            tmp.outputStream().use { output ->
                                val buffer = ByteArray(8 * 1024)
                                while (true) {
                                    val read = input.read(buffer)
                                    if (read < 0) break
                                    total += read
                                    if (total > MAX_BACKGROUND_BYTES) {
                                        error = "图片超过 10MB，请换一张"
                                        break
                                    }
                                    output.write(buffer, 0, read)
                                }
                            }
                        }
                        if (error == null && tmp.length() <= 0L) error = "下载失败：图片为空"
                        if (error == null && !tmp.renameTo(dest)) error = "保存背景失败，请重试"
                    }
                }
            }
        } catch (_: Exception) {
            error = "下载失败，请检查网络或图片地址"
        } finally {
            if (error != null) tmp.delete()
        }
        error
    }

@Composable
private fun SettingLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    )
}

@Composable
private fun ThemeRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 8.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(start = 4.dp))
    }
}