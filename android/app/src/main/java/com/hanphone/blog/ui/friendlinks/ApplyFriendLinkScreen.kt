package com.hanphone.blog.ui.friendlinks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.imeLiftAboveKeyboard
import com.hanphone.blog.ui.components.rememberToast
import kotlinx.coroutines.launch

/** 申请友链的两种填写方式（对齐网页 ApplyModal 的「表单填写 / 文本粘贴」tab） */
private enum class ApplyMode { FORM, TEXT }

/**
 * 申请友链（免登录）：表单填写 或 粘贴 JSON / YAML / 中文键值对。
 * 幂等：X-Request-Id 在失败重试时复用，只有成功后才换新，避免重试写重复记录。
 */
@Composable
fun ApplyFriendLinkScreen(onBack: () -> Unit, onDone: () -> Unit = onBack) {
    val repo = remember { BlogRepository() }
    val scope = rememberCoroutineScope()
    val toast = rememberToast()

    var mode by remember { mutableStateOf(ApplyMode.FORM) }
    var name by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var nickname by remember { mutableStateOf("") }
    var avatar by remember { mutableStateOf("") }
    var siteshot by remember { mutableStateOf("") }
    var rss by remember { mutableStateOf("") }
    var color by remember { mutableStateOf("#1890ff") }
    var applyText by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }

    // 幂等 id：失败重试复用同一个，成功后才换新
    var requestId by remember { mutableStateOf(ApiClient.newRequestId()) }

    fun blankToNull(value: String): String? = value.trim().ifBlank { null }

    fun submit() {
        if (submitting) return
        if (mode == ApplyMode.FORM) {
            if (name.isBlank()) { toast("请填写网站名称"); return }
            val u = url.trim()
            if (u.isBlank()) { toast("请填写网站地址"); return }
            if (!u.startsWith("http://") && !u.startsWith("https://")) {
                toast("网站地址需以 http:// 或 https:// 开头"); return
            }
            if (description.isBlank()) { toast("请填写网站描述"); return }
        } else if (applyText.isBlank()) {
            toast("请粘贴站点信息"); return
        }
        scope.launch {
            submitting = true
            try {
                val res = repo.applyFriendLink(
                    requestId = requestId,
                    name = name.trim(),
                    url = url.trim(),
                    description = description.trim(),
                    avatar = blankToNull(avatar),
                    siteshot = blankToNull(siteshot),
                    rss = blankToNull(rss),
                    nickname = blankToNull(nickname),
                    color = blankToNull(color),
                    applyText = if (mode == ApplyMode.TEXT) blankToNull(applyText) else null
                )
                if (res.flag) {
                    // 成功才换新 id：下次是新申请，不该被后端当作重复提交
                    requestId = ApiClient.newRequestId()
                    toast("申请已提交，等待审核")
                    onDone()
                } else {
                    toast(res.message.ifBlank { "提交失败，请稍后重试" })
                }
            } catch (e: Exception) {
                toast("提交失败，请稍后重试")
            } finally {
                submitting = false
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "申请友链", onBack = onBack)
        Column(
            Modifier.fillMaxSize()
                .imeLiftAboveKeyboard()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                FilterChip(
                    selected = mode == ApplyMode.FORM,
                    onClick = { mode = ApplyMode.FORM },
                    label = { Text("表单填写") }
                )
                FilterChip(
                    selected = mode == ApplyMode.TEXT,
                    onClick = { mode = ApplyMode.TEXT },
                    label = { Text("文本粘贴") }
                )
            }

            if (mode == ApplyMode.FORM) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("网站名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("网站地址") },
                    placeholder = { Text("https://example.com") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("网站描述") },
                    minLines = 2,
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = nickname,
                    onValueChange = { nickname = it },
                    label = { Text("站长昵称（可选）") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = avatar,
                    onValueChange = { avatar = it },
                    label = { Text("头像地址（可选）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = siteshot,
                    onValueChange = { siteshot = it },
                    label = { Text("站点截图（可选）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = rss,
                    onValueChange = { rss = it },
                    label = { Text("RSS 地址（可选）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = color,
                    onValueChange = { color = it },
                    label = { Text("主题颜色（可选）") },
                    placeholder = { Text("#1890ff") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
            } else {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                        Text(
                            "粘贴 JSON / YAML / 中文键值对均可，例如：",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "名称: 云林有风\n链接: https://example.com\n描述: 一句话介绍\n头像 / 截图 / RSS / 昵称 / 颜色（可选）",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
                OutlinedTextField(
                    value = applyText,
                    onValueChange = { applyText = it },
                    label = { Text("站点信息") },
                    placeholder = { Text("直接粘贴网站友链代码或键值文本") },
                    minLines = 8,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
            }

            Button(
                onClick = { submit() },
                enabled = !submitting,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
            ) {
                Text(if (submitting) "提交中…" else "提交申请")
            }
            Text(
                "提交后需人工审核，通过后会出现在友链页。",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}
