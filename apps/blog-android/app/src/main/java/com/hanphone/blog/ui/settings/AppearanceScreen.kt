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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hanphone.blog.core.backgroundBlur
import com.hanphone.blog.core.backgroundPath
import com.hanphone.blog.core.setBackgroundBlur
import com.hanphone.blog.core.setBackgroundPath
import com.hanphone.blog.core.setThemeMode
import com.hanphone.blog.core.themeMode
import com.hanphone.blog.ui.components.AppBackBar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
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

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

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
                                if (bgPath != null) "已启用（模糊 $bgBlur）" else "从相册选择一张图片",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        OutlinedButton(onClick = { bgPicker.launch("image/*") }) {
                            Text(if (bgPath != null) "更换" else "选择")
                        }
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