package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.material3.AlertDialog
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.model.McpKeySummary
import com.hanphone.blog.data.model.PersonInfo
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.ToastMessage
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.util.emailError
import com.hanphone.blog.util.formatDateTime
import com.hanphone.blog.util.nicknameError
import com.hanphone.blog.util.passwordError

/**
 * 后台个人中心（原生，替代原先的 /admin/personal WebView）。
 *
 * 六个板块：信息 / 技能 / 爱好 / 作品 / 评价 / 密钥。信息板块改昵称/邮箱/头像 + 改密码；
 * 其余四个板块是同一张 personal_info 表按 category 分组的增删改；密钥板块管理 MCP API Key
 * （创建/轮转后的明文只展示一次）。
 */
@Composable
fun AdminPersonalScreen(
    onBack: () -> Unit,
    onLoggedOut: () -> Unit,
    vm: AdminPersonalViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val toast = rememberToast()
    val clipboard = LocalClipboardManager.current

    var editing by remember { mutableStateOf<PersonInfo?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<PersonInfo?>(null) }
    var creatingKey by remember { mutableStateOf(false) }
    var pendingRegen by remember { mutableStateOf<McpKeySummary?>(null) }
    var pendingDeleteKey by remember { mutableStateOf<McpKeySummary?>(null) }
    var showPassword by remember { mutableStateOf(false) }

    ToastMessage(vm.message, vm::consumeMessage)

    // 改密码（管理员重置自己）成功后服务端吊销全部会话，必须回到「我的」未登录态
    LaunchedEffect(vm.loggedOut) {
        if (vm.loggedOut) {
            vm.consumeLoggedOut()
            toast("密码已修改，请重新登录")
            onLoggedOut()
        }
    }

    val tab = vm.tab
    AdminScaffold(
        title = "个人中心",
        onBack = onBack,
        refreshable = vm,
        actions = {
            when {
                tab == PersonalTab.KEYS -> TextButton(onClick = { creatingKey = true }) { Text("新增") }
                tab.category != null && tab.category != "" ->
                    TextButton(onClick = { creating = true }) { Text("新增") }
            }
        }
    ) {
        // 板块切换
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            PersonalTab.entries.forEach { item ->
                FilterChip(
                    selected = tab == item,
                    onClick = { vm.chooseTab(item) },
                    label = { Text(item.label) }
                )
            }
        }

        when {
            vm.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }

            tab == PersonalTab.INFO -> InfoTab(vm, onChangePassword = { showPassword = true })
            tab == PersonalTab.KEYS -> KeysTab(
                vm = vm,
                onRegenerate = { pendingRegen = it },
                onDelete = { pendingDeleteKey = it }
            )

            else -> PersonItemsTab(
                vm = vm,
                onEdit = { editing = it },
                onDelete = { pendingDelete = it }
            )
        }
    }

    // ===== 条目新增 / 编辑 =====
    (editing ?: if (creating) PersonInfo(category = vm.tab.category.orEmpty()) else null)?.let { initial ->
        PersonItemDialog(
            initial = initial,
            vm = vm,
            onDismiss = { editing = null; creating = false }
        )
    }

    pendingDelete?.let { item ->
        AdminConfirmDialog(
            title = "删除条目",
            text = "确定删除「${item.name}」？此操作不可撤销。",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.deleteItem(item); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }

    // ===== 密钥 =====
    if (creatingKey) {
        CreateMcpKeyDialog(
            vm = vm,
            onDismiss = { creatingKey = false },
            onCreated = { creatingKey = false }
        )
    }

    vm.revealed?.let { detail ->
        AlertDialog(
            onDismissRequest = { vm.consumeRevealed() },
            title = { Text("密钥已生成") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "完整密钥只显示这一次，请立即复制保存。关闭后列表里只能看到前缀。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                    SelectionContainer {
                        Text(
                            detail.key.orEmpty(),
                            style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    clipboard.setText(AnnotatedString(detail.key.orEmpty()))
                    toast("已复制")
                    vm.consumeRevealed()
                }) { Text("复制并关闭") }
            },
            dismissButton = {
                TextButton(onClick = { vm.consumeRevealed() }) { Text("关闭") }
            }
        )
    }

    pendingRegen?.let { key ->
        AdminConfirmDialog(
            title = "轮转密钥",
            text = "轮转后旧密钥立即失效，使用它的 Agent 需要换成新密钥。继续？",
            confirmText = "轮转",
            onConfirm = { vm.regenerateKey(key) { pendingRegen = null }; pendingRegen = null },
            onDismiss = { pendingRegen = null }
        )
    }

    pendingDeleteKey?.let { key ->
        AdminConfirmDialog(
            title = "删除密钥",
            text = "确定删除「${key.name}」？使用它的 Agent 将立即无法访问。",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.deleteKey(key); pendingDeleteKey = null },
            onDismiss = { pendingDeleteKey = null }
        )
    }

    if (showPassword) {
        ChangePasswordDialog(
            vm = vm,
            onDismiss = { showPassword = false }
        )
    }
}

// ===== 信息 =====

@Composable
private fun InfoTab(vm: AdminPersonalViewModel, onChangePassword: () -> Unit) {
    val context = LocalContext.current
    val toast = rememberToast()

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            vm.uploadAvatar(uri) { url ->
                if (url != null) vm.onAvatar(url) else toast("头像上传失败")
            }
        }
    }

    fun save() {
        nicknameError(vm.nickname)?.let { toast(it); return }
        emailError(vm.email)?.let { toast(it); return }
        vm.saveProfile { }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            Modifier.fillMaxWidth().clickable(enabled = !vm.uploading) { picker.launch("image/*") },
            contentAlignment = Alignment.Center
        ) {
            Avatar(
                url = vm.avatar.ifBlank { null },
                name = vm.nickname.ifBlank { "寒" },
                size = 76.dp
            )
            if (vm.uploading) {
                CircularProgressIndicator(Modifier.size(76.dp), strokeWidth = 2.dp)
            }
        }
        Text(
            if (vm.uploading) "头像上传中…" else "点击头像从相册更换",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )

        AdminField(vm.nickname, vm::onNickname, "昵称")
        AdminField(
            vm.email,
            vm::onEmail,
            "邮箱",
            keyboardType = KeyboardType.Email
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "用户名 ${vm.user?.username ?: "—"}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline
            )
            Text(
                "用户类型 ${if (vm.user?.type == "1") "管理员" else "普通用户"}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline
            )
        }
        AdminField(vm.avatar, vm::onAvatar, "头像 URL", placeholder = "可留空")

        Button(
            onClick = { save() },
            enabled = !vm.busy && !vm.uploading,
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
        ) {
            Text(if (vm.busy) "保存中…" else "保存修改")
        }
        OutlinedButton(
            onClick = onChangePassword,
            enabled = !vm.busy,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("修改密码")
        }
        Text(
            "修改密码后所有设备（含当前手机）都需要重新登录。",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline
        )
    }
}

// ===== 技能 / 爱好 / 作品 / 评价 =====

@Composable
private fun PersonItemsTab(
    vm: AdminPersonalViewModel,
    onEdit: (PersonInfo) -> Unit,
    onDelete: (PersonInfo) -> Unit
) {
    val list = vm.itemsFor(vm.tab)
    if (list.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                "还没有${vm.tab.label}条目，点右上角「新增」",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }
    LazyColumn(Modifier.fillMaxSize()) {
        items(list, key = { it.id ?: it.name.orEmpty() }) { item ->
            Row(
                Modifier.fillMaxWidth().padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        item.name.orEmpty(),
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    val desc = item.description.orEmpty()
                    if (desc.isNotBlank()) {
                        Text(
                            desc,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if ((item.rank ?: 0) > 0) {
                            Text(
                                "排序 ${item.rank}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                        val url = item.url.orEmpty()
                        if (url.isNotBlank()) {
                            Text(
                                url,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                        }
                    }
                }
                AdminRowMenu(
                    listOf(
                        AdminMenuAction(label = "编辑", onClick = { onEdit(item) }),
                        AdminMenuAction(label = "删除", onClick = { onDelete(item) }, destructive = true)
                    )
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
        }
    }
}

@Composable
private fun PersonItemDialog(
    initial: PersonInfo,
    vm: AdminPersonalViewModel,
    onDismiss: () -> Unit
) {
    val toast = rememberToast()
    var name by remember { mutableStateOf(initial.name.orEmpty()) }
    var description by remember { mutableStateOf(initial.description.orEmpty()) }
    var url by remember { mutableStateOf(initial.url.orEmpty()) }
    var iconSrc by remember { mutableStateOf(initial.iconSrc.orEmpty()) }
    var picUrl by remember { mutableStateOf(initial.picUrl.orEmpty()) }
    var rank by remember {
        mutableStateOf((initial.rank?.takeIf { it > 0 } ?: 0L).toString())
    }

    val picPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            vm.uploadPersonImage(uri) { pic ->
                if (pic != null) picUrl = pic
            }
        }
    }
    // 与网页表单一致：只有「作品 / 爱好」有配图字段，技能与评价不显示
    val showPic = vm.tab == PersonalTab.WORK || vm.tab == PersonalTab.HOBBY

    AdminFormDialog(
        title = if (initial.id == null) "新增${vm.tab.label}" else "编辑${vm.tab.label}",
        onDismiss = onDismiss,
        saving = vm.busy,
        onSave = {
            if (name.isBlank()) { toast("名称不能为空"); return@AdminFormDialog }
            vm.saveItem(
                initial.copy(
                    name = name.trim(),
                    description = description.trim(),
                    url = url.trim().ifBlank { null },
                    iconSrc = iconSrc.trim().ifBlank { null },
                    picUrl = picUrl.trim().ifBlank { null },
                    rank = rank.trim().toLongOrNull() ?: 0L
                )
            ) { onDismiss() }
        }
    ) {
        AdminField(name, { name = it }, "名称")
        AdminField(description, { description = it }, "描述", singleLine = false, minLines = 3)
        AdminField(url, { url = it }, "链接", placeholder = "https://，可留空")
        AdminField(iconSrc, { iconSrc = it }, "图标类型", placeholder = "如 music / video / sport / code，可留空")
        if (showPic) {
            AdminImageField(
                value = picUrl,
                onValueChange = { picUrl = it },
                label = "配图",
                uploading = vm.uploadingPic,
                onPick = { picPicker.launch("image/*") },
                aspectRatio = 16f / 9f
            )
        }
        AdminField(
            rank,
            { rank = it.filter { c -> c.isDigit() || c == '-' } },
            "排序（越小越靠前）",
            keyboardType = KeyboardType.Number,
            placeholder = "0"
        )
    }
}

// ===== MCP 密钥 =====

@Composable
private fun KeysTab(
    vm: AdminPersonalViewModel,
    onRegenerate: (McpKeySummary) -> Unit,
    onDelete: (McpKeySummary) -> Unit
) {
    if (vm.keys.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                "还没有 MCP 密钥，点右上角「新增」创建一把",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }
    LazyColumn(Modifier.fillMaxSize()) {
        items(vm.keys, key = { it.id }) { key ->
            Row(
                Modifier.fillMaxWidth().padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            key.name,
                            style = MaterialTheme.typography.bodyLarge,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        AdminBadge(
                            if (key.active) "启用中" else "已停用",
                            if (key.active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                        )
                    }
                    Text(
                        "${key.prefix}••••••••",
                        style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    val last = key.lastUsedAt?.let { "最近使用 ${formatDateTime(it)}" } ?: "尚未使用"
                    Text(
                        last,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
                AdminRowMenu(
                    listOf(
                        AdminMenuAction(label = "轮转密钥", onClick = { onRegenerate(key) }),
                        AdminMenuAction(label = if (key.active) "停用" else "启用", onClick = { vm.toggleKey(key) }),
                        AdminMenuAction(label = "删除", onClick = { onDelete(key) }, destructive = true)
                    )
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
        }
    }
}

@Composable
private fun CreateMcpKeyDialog(
    vm: AdminPersonalViewModel,
    onDismiss: () -> Unit,
    onCreated: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    AdminFormDialog(
        title = "新建 MCP 密钥",
        onDismiss = onDismiss,
        saving = vm.busy,
        saveText = "创建",
        onSave = {
            vm.createKey(name) { onCreated() }
        }
    ) {
        AdminField(name, { name = it }, "名称", placeholder = "如：Claude Desktop / 我的脚本")
        Text(
            "创建后会立即显示一次完整密钥，请复制保存；列表里只保留前缀。",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline
        )
    }
}

// ===== 改密码 =====

@Composable
private fun ChangePasswordDialog(
    vm: AdminPersonalViewModel,
    onDismiss: () -> Unit
) {
    val toast = rememberToast()
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }

    fun submit() {
        passwordError(password)?.let { toast(it); return }
        if (password != confirm) { toast("两次输入的密码不一致"); return }
        vm.changePassword(password) { onDismiss() }
    }

    AdminFormDialog(
        title = "修改密码",
        onDismiss = onDismiss,
        saving = vm.busy,
        saveText = "修改",
        onSave = ::submit
    ) {
        AdminField(password, { password = it }, "新密码", password = true)
        AdminField(confirm, { confirm = it }, "确认新密码", password = true)
        Text(
            "密码 ≥6 位且包含字母和数字；修改后所有设备（含当前手机）都会退出登录。",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.error
        )
    }
}
