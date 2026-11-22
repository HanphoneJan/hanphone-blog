package com.hanphone.blog.ui.friendlinks

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.data.repo.FileRepository
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.imeLiftAboveKeyboard
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.util.MediaPicker
import com.hanphone.blog.util.UrlRules
import com.hanphone.blog.util.resolveImageUrl
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
    // 申请页免登录，图片走公开上传接口（/upload/public-image，字段名 file）
    val fileRepo = remember { FileRepository() }
    val context = LocalContext.current
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
    var uploadingAvatar by remember { mutableStateOf(false) }
    var uploadingSiteshot by remember { mutableStateOf(false) }

    // 幂等 id：失败重试复用同一个，成功后才换新
    var requestId by remember { mutableStateOf(ApiClient.newRequestId()) }

    fun blankToNull(value: String): String? = value.trim().ifBlank { null }

    /** 相册图 → MediaPicker 压缩 → 公开上传；临时文件无论成败都清理 */
    suspend fun uploadPicked(uri: android.net.Uri): String? {
        val media = runCatching { MediaPicker.prepare(context, uri) }.getOrNull() ?: return null
        return try {
            fileRepo.uploadPublicImage(media.file)
        } finally {
            MediaPicker.cleanup(media.file)
        }
    }

    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null && !uploadingAvatar) {
            uploadingAvatar = true
            scope.launch {
                val url = uploadPicked(uri)
                uploadingAvatar = false
                if (url != null) {
                    avatar = url
                    toast("头像已上传")
                } else {
                    toast("头像上传失败，可稍后重试或手动填写地址")
                }
            }
        }
    }

    val siteshotPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null && !uploadingSiteshot) {
            uploadingSiteshot = true
            scope.launch {
                val url = uploadPicked(uri)
                uploadingSiteshot = false
                if (url != null) {
                    siteshot = url
                    toast("截图已上传")
                } else {
                    toast("截图上传失败，可稍后重试或手动填写地址")
                }
            }
        }
    }

    fun submit() {
        if (submitting || uploadingAvatar || uploadingSiteshot) return
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
                ImageUploadRow(
                    url = avatar,
                    uploading = uploadingAvatar,
                    label = "可从相册上传头像",
                    onPick = { avatarPicker.launch("image/*") }
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
                ImageUploadRow(
                    url = siteshot,
                    uploading = uploadingSiteshot,
                    label = "可从相册上传站点截图",
                    onPick = { siteshotPicker.launch("image/*") }
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
                enabled = !submitting && !uploadingAvatar && !uploadingSiteshot,
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

/**
 * 友链表单里的图片地址行：小预览 + 相册上传。上传中禁用按钮并显示进度，
 * 上传成功后把外链 URL 回填到对应输入框（仍然可手改）。
 */
@Composable
private fun ImageUploadRow(
    url: String,
    uploading: Boolean,
    label: String,
    onPick: () -> Unit
) {
    val trimmed = url.trim()
    val preview = resolveImageUrl(trimmed)?.takeIf {
        UrlRules.isHttpUrl(trimmed) || trimmed.startsWith("/")
    }
    Row(
        Modifier.fillMaxWidth().padding(top = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (preview != null) {
            AsyncImage(
                model = preview,
                contentDescription = "图片预览",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            )
        }
        TextButton(onClick = onPick, enabled = !uploading) {
            Text(if (uploading) "上传中…" else "从相册选择")
        }
        if (uploading) {
            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
        } else if (preview == null) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}
