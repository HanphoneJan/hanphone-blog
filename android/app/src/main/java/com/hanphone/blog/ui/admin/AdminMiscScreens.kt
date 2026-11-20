package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.User
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.SearchField
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * 文库维护。
 *
 * 新增流程对齐网页版：先把文件上传到 `docNamespace`，再用返回的文件名登记一条 Doc 记录
 * （docId 由前端生成：`doc-{时间戳}-{随机串}`）。
 */
@Composable
fun AdminDocsScreen(
    onBack: () -> Unit,
    vm: AdminDocsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<Doc?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Doc?>(null) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(
        title = "文库管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } }
    ) {
        when {
            vm.loading && vm.items.isEmpty() -> AdminLoading()
            vm.items.isEmpty() -> AdminEmpty("还没有文库文件")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.items, key = { it.id }) { doc ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f).padding(end = 6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    doc.title,
                                    style = MaterialTheme.typography.bodyLarge,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f, fill = false)
                                )
                                if (doc.recommend) {
                                    AdminStarMark(Modifier.padding(start = 6.dp))
                                }
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(top = 3.dp)
                            ) {
                                AdminBadge(doc.fileType.ifBlank { "FILE" }, MaterialTheme.colorScheme.secondary)
                                AdminBadge(
                                    if (doc.published == true) "已发布" else "草稿",
                                    if (doc.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                )
                                Text(
                                    "${doc.docNamespace} · ${doc.viewCount} 次",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        AdminRowMenu(
                            listOf(
                                AdminMenuAction(
                                    label = if (doc.published == true) "下线" else "发布",
                                    onClick = { vm.togglePublished(doc) }
                                ),
                                AdminMenuAction(label = "编辑", onClick = { editing = doc }),
                                AdminMenuAction(
                                    label = "删除",
                                    onClick = { pendingDelete = doc },
                                    destructive = true
                                )
                            )
                        )
                    }
                    AdminDivider()
                }
            }
        }
    }

    if (creating || editing != null) {
        DocDialog(
            initial = editing,
            vm = vm,
            onDismiss = { creating = false; editing = null },
            onSave = { payload -> vm.save(payload) { creating = false; editing = null } }
        )
    }

    pendingDelete?.let { doc ->
        AdminConfirmDialog(
            title = "删除文件记录",
            text = "「${doc.title}」的记录会被删除（物理文件需到文件服务清理），确定继续？",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(doc); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun DocDialog(
    initial: Doc?,
    vm: AdminDocsViewModel,
    onDismiss: () -> Unit,
    onSave: (Map<String, Any?>) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var title by remember { mutableStateOf(initial?.title.orEmpty()) }
    var description by remember { mutableStateOf(initial?.description.orEmpty()) }
    var namespace by remember { mutableStateOf(initial?.docNamespace?.ifBlank { "blog/docs" } ?: "blog/docs") }
    var filename by remember { mutableStateOf(initial?.filename.orEmpty()) }
    var fileType by remember { mutableStateOf(initial?.fileType.orEmpty()) }
    var uploading by remember { mutableStateOf(false) }
    var recommend by remember { mutableStateOf(initial?.recommend ?: false) }
    var published by remember { mutableStateOf(initial?.published != false) }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            uploading = true
            try {
                val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
                val name = queryName(context, uri) ?: "upload.bin"
                val temp = java.io.File(context.cacheDir, "doc_${System.currentTimeMillis()}_$name")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                }
                val uploaded = vm.uploadDoc(temp, mime, namespace.ifBlank { "blog/docs" })
                if (uploaded != null) {
                    filename = uploaded.first
                    fileType = uploaded.second
                    if (title.isBlank()) title = name.substringBeforeLast('.')
                }
                temp.delete()
            } finally {
                uploading = false
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "新增文库文件" else "编辑文库文件") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                AdminField(title, { title = it }, "标题")
                AdminGap(8)
                AdminField(description, { description = it }, "简介", singleLine = false, minLines = 2)
                AdminGap(8)
                AdminField(namespace, { namespace = it }, "命名空间", placeholder = "blog/docs")
                AdminGap(8)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = {
                        filePicker.launch(arrayOf("*/*"))
                    }, enabled = !uploading) { Text(if (uploading) "上传中…" else "选择并上传文件") }
                }
                Text(
                    if (filename.isBlank()) "尚未选择文件" else "$filename（${fileType.ifBlank { "?" }}）",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                AdminGap(8)
                AdminSwitchRow("发布", published, { published = it })
                AdminSwitchRow("推荐", recommend, { recommend = it })
            }
        },
        confirmButton = {
            TextButton(onClick = {
                if (filename.isBlank()) {
                    Toast.makeText(context, "请先上传文件", Toast.LENGTH_SHORT).show()
                    return@TextButton
                }
                val docId = initial?.docId?.takeIf { it.isNotBlank() }
                    ?: "doc-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}"
                val payload = mutableMapOf<String, Any?>(
                    "docId" to docId,
                    "title" to title.trim().ifBlank { filename },
                    "description" to description.trim(),
                    "filename" to filename,
                    "fileType" to fileType.ifBlank { filename.substringAfterLast('.', "").uppercase() },
                    "docNamespace" to namespace.trim().ifBlank { "blog/docs" },
                    "recommend" to recommend,
                    "published" to published
                )
                if (initial != null) payload["id"] = initial.id
                onSave(payload)
            }) { Text("保存") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}

private fun queryName(context: android.content.Context, uri: android.net.Uri): String? = runCatching {
    context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
        if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
    }
}.getOrNull()

/** 用户管理：资料 / 管理员权限 / 重置密码 / 删除（对齐网页后台 /admin/users） */
@Composable
fun AdminUsersScreen(
    onBack: () -> Unit,
    vm: AdminUsersViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<User?>(null) }
    var resetting by remember { mutableStateOf<User?>(null) }
    var pendingDelete by remember { mutableStateOf<User?>(null) }

    LaunchedMessage(vm.message) {
        Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        vm.consumeMessage()
    }

    AdminScaffold(title = "用户管理", onBack = onBack) {
        SearchField(
            value = vm.keyword,
            onValueChange = vm::search,
            placeholder = "搜索昵称 / 登录名 / 邮箱",
            modifier = Modifier.padding(vertical = 8.dp)
        )
        Text(
            "共 ${vm.filtered.size} 位用户",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        when {
            vm.loading && vm.all.isEmpty() -> AdminLoading()
            vm.filtered.isEmpty() -> AdminEmpty("没有匹配的用户")
            else -> LazyColumn(Modifier.fillMaxWidth()) {
                items(vm.filtered, key = { it.id }) { user ->
                    UserRow(
                        user = user,
                        isSelf = user.id == vm.selfId,
                        protected = vm.isProtected(user),
                        enabled = !vm.busy,
                        onEdit = { editing = user },
                        onToggleAdmin = { vm.setAdmin(user, user.type != "1") },
                        onResetPassword = { resetting = user },
                        onDelete = { pendingDelete = user }
                    )
                    AdminDivider()
                }
            }
        }
    }

    editing?.let { user ->
        UserEditDialog(user = user, vm = vm, onDismiss = { editing = null })
    }

    resetting?.let { user ->
        UserPasswordDialog(user = user, vm = vm, onDismiss = { resetting = null })
    }

    pendingDelete?.let { user ->
        AdminConfirmDialog(
            title = "删除用户",
            text = "确定删除「${user.nickname ?: user.username.orEmpty()}」？此操作不可撤销。",
            confirmText = "删除",
            destructive = true,
            onConfirm = {
                vm.delete(user)
                pendingDelete = null
            },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun UserRow(
    user: User,
    isSelf: Boolean,
    protected: Boolean,
    enabled: Boolean,
    onEdit: () -> Unit,
    onToggleAdmin: () -> Unit,
    onResetPassword: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(url = user.avatar, name = user.nickname ?: user.username ?: "匿", size = 34.dp)
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    user.nickname ?: "（未设置昵称）",
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (user.type == "1") AdminBadge("管理员")
                if (isSelf) AdminBadge("我", MaterialTheme.colorScheme.secondary)
            }
            Text(
                listOfNotNull(user.username?.let { "@$it" }, user.email)
                    .joinToString(" · ")
                    .ifBlank { "—" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        AdminRowMenu(
            listOf(
                AdminMenuAction(label = "编辑资料", onClick = onEdit, enabled = enabled),
                AdminMenuAction(
                    label = if (user.type == "1") "取消管理员" else "设为管理员",
                    onClick = onToggleAdmin,
                    enabled = enabled && !protected
                ),
                AdminMenuAction(label = "重置密码", onClick = onResetPassword, enabled = enabled),
                AdminMenuAction(
                    label = "删除",
                    onClick = onDelete,
                    enabled = enabled && !protected,
                    destructive = true
                )
            )
        )
    }
}

/** 编辑用户资料：昵称 / 邮箱（改动二次确认）/ 头像（相册上传或填 URL） */
@Composable
private fun UserEditDialog(
    user: User,
    vm: AdminUsersViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    var nickname by remember { mutableStateOf(user.nickname.orEmpty()) }
    var email by remember { mutableStateOf(user.email.orEmpty()) }
    var avatar by remember { mutableStateOf(user.avatar.orEmpty()) }
    var confirmEmail by remember { mutableStateOf(false) }
    val originalEmail = user.email.orEmpty()

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            vm.uploadAvatar(uri) { url ->
                if (url != null) avatar = url else toast("头像上传失败")
            }
        }
    }

    fun save() {
        if (nickname.trim().length !in 2..10) {
            toast("昵称长度在 2-10 个字符之间")
            return
        }
        if (!Regex("""^[^@\s]+@[^@\s]+\.[^@\s]+$""").matches(email.trim())) {
            toast("请输入有效的邮箱地址")
            return
        }
        vm.saveProfile(user, nickname, email, avatar) { onDismiss() }
    }

    fun requestSave() {
        if (email.trim() != originalEmail.trim()) confirmEmail = true else save()
    }

    AlertDialog(
        onDismissRequest = { if (!vm.busy && !vm.uploading) onDismiss() },
        title = { Text("编辑用户") },
        text = {
            Column(
                Modifier
                    .heightIn(max = minOf(420.dp, LocalConfiguration.current.screenHeightDp.dp * 0.6f))
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    "用户名 ${user.username ?: "—"}（不可修改）",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
                Box(
                    Modifier.clickable(enabled = !vm.uploading) { picker.launch("image/*") },
                    contentAlignment = Alignment.Center
                ) {
                    Avatar(
                        url = avatar.ifBlank { null },
                        name = nickname.ifBlank { "友" },
                        size = 64.dp
                    )
                    if (vm.uploading) {
                        CircularProgressIndicator(Modifier.size(64.dp), strokeWidth = 2.dp)
                    }
                }
                Text(
                    if (vm.uploading) "头像上传中…" else "点击头像从相册更换",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
                AdminField(avatar, { avatar = it }, "头像 URL", placeholder = "可留空")
                AdminField(nickname, { nickname = it }, "昵称")
                AdminField(
                    email,
                    { email = it },
                    "邮箱",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Email
                )
            }
        },
        confirmButton = {
            TextButton(enabled = !vm.busy && !vm.uploading, onClick = ::requestSave) {
                Text(if (vm.busy) "保存中…" else "保存")
            }
        },
        dismissButton = {
            TextButton(enabled = !vm.busy && !vm.uploading, onClick = onDismiss) { Text("取消") }
        }
    )

    // 改邮箱 = 改登录账号，和网页后台一样先确认一次。
    // 放在编辑弹窗之后声明：两个 Dialog 各是一层窗口，后声明的在上，确认框不会被编辑框盖住。
    if (confirmEmail) {
        AdminConfirmDialog(
            title = "确认修改邮箱",
            text = "改完后该用户下次登录需使用新邮箱：${email.trim()}",
            confirmText = "确认修改",
            onConfirm = {
                confirmEmail = false
                save()
            },
            onDismiss = { confirmEmail = false }
        )
    }
}

/** 管理员重置某用户密码（传 md5，后端 bcrypt 存储；成功即全端下线） */
@Composable
private fun UserPasswordDialog(
    user: User,
    vm: AdminUsersViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }

    fun submit() {
        if (password.length !in 6..20) {
            toast("密码长度在 6-20 个字符之间")
            return
        }
        if (!Regex("""^(?=.*[a-zA-Z])(?=.*\d).+$""").matches(password)) {
            toast("密码必须包含字母和数字")
            return
        }
        if (password != confirm) {
            toast("两次输入的密码不一致")
            return
        }
        vm.resetPassword(user, password) { onDismiss() }
    }

    AlertDialog(
        onDismissRequest = { if (!vm.busy) onDismiss() },
        title = { Text("重置密码") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "为「${user.nickname ?: user.username.orEmpty()}」设置新密码，重置后该用户所有设备需重新登录。",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                AdminField(password, { password = it }, "新密码", password = true)
                AdminField(confirm, { confirm = it }, "确认新密码", password = true)
                Text(
                    "6-20 位，需包含字母和数字",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        },
        confirmButton = {
            TextButton(enabled = !vm.busy, onClick = ::submit) {
                Text(if (vm.busy) "提交中…" else "重置")
            }
        },
        dismissButton = {
            TextButton(enabled = !vm.busy, onClick = onDismiss) { Text("取消") }
        }
    )
}

/** 聚合数据：见 AdminInsightScreen.kt（对标网页后台 /admin/insight） */
