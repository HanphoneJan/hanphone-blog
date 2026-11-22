package com.hanphone.blog.ui.profile

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.R
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.cache.NotificationBadge
import com.hanphone.blog.data.model.User
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.SectionTitle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.hanphone.blog.util.UrlRules
import com.hanphone.blog.util.emailError
import com.hanphone.blog.util.isValidEmail
import com.hanphone.blog.util.passwordError

/** 我的：身份区 + 账号相关入口（通知/收藏/友链/设置/管理）。
 *  热点、项目、文库、音乐库、照片墙、留言板等内容型入口已迁到首页宫格，
 *  **不要在这里再放一份**（两处都有等于两处都找不到）。 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogin: () -> Unit,
    onOpenFriendLinks: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenBookmarks: () -> Unit,
    onOpenAdmin: () -> Unit
) {
    val vm: ProfileViewModel = hiltViewModel()
    val unreadNotifications by NotificationBadge.unread.collectAsState()
    val token by TokenStore.token.collectAsState()
    val userId by TokenStore.userId.collectAsState()
    val userName by TokenStore.nickname.collectAsState()
    val userAvatar by TokenStore.avatar.collectAsState()
    val userType by TokenStore.userType.collectAsState()
    var showEditProfile by remember { mutableStateOf(false) }

    // 登录态变化时拉取完整资料（头像/昵称/用户名）
    LaunchedEffect(userId) { vm.loadProfile(userId) }

    // 展示优先级：网络资料 > 本地登录态缓存
    val displayName = vm.profile?.nickname?.takeIf { it.isNotBlank() } ?: (userName ?: "云林访客")
    val displayAvatar = vm.profile?.avatar ?: userAvatar
    val displayUsername = vm.profile?.username ?: ""

    PullRefresh(vm, Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
        // ===== 身份区 =====
        // 身份只画一处：头像/昵称统一用 displayName/displayAvatar（服务端资料优先、TokenStore 兜底），
        // 不再额外放一张「已登录」卡片，避免同一份信息出现两次（旧卡片还读 TokenStore，可能显示旧昵称）。
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            if (token != null) {
                Box(
                    Modifier
                        .clickable { showEditProfile = true }
                        .semantics {
                            contentDescription = "编辑资料"
                            role = Role.Button
                        }
                ) {
                    Avatar(url = displayAvatar, name = displayName, size = 76.dp, feature = ImageCaches.Feature.PROFILE)
                    // 铅笔角标：替代原来那行「点击头像可修改资料」提示
                    Box(
                        Modifier
                            .align(Alignment.BottomEnd)
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                            .border(2.dp, MaterialTheme.colorScheme.surface, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
                Text(
                    displayName,
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp, start = 24.dp, end = 24.dp)
                )
                // 用户名最小高度占位：资料加载出 @用户名 时不再顶动下方内容；heightIn 可随字号放大
                Box(
                    Modifier.heightIn(min = 20.dp).padding(horizontal = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (displayUsername.isNotBlank()) {
                        Text("@$displayUsername", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                // 未登录：博客图标占位（对齐网站图标，不再用文字「云」）
                Image(
                    painter = painterResource(R.drawable.ic_blog),
                    contentDescription = "云林有风",
                    modifier = Modifier.size(80.dp).clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Text("云林有风", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 10.dp))
                Text("Hanphone 的个人博客 · 记录与分享", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "登录后可聊天、点赞、评论",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp)
                )
                Button(onClick = onLogin, modifier = Modifier.padding(top = 14.dp)) { Text("登录") }
            }
        }

        // ===== 账号相关入口 =====
        // 只有「跟着账号走」的才留在这一页：通知、收藏、友链、设置。
        // 内容/工具型入口（热点/项目/文库/音乐库/照片墙/留言板）在首页宫格。
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column {
                MoreRow(
                    Icons.Filled.Notifications,
                    "通知",
                    if (unreadNotifications > 0) "$unreadNotifications 条未读" else "评论与回复提醒",
                    onOpenNotifications
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.Bookmark, "我的收藏", "博客 · 随笔 · 文档", onOpenBookmarks)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.Share, "友链", "小伙伴的博客", onOpenFriendLinks)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.Settings, "设置", "账号 · 外观 · 缓存 · 更新", onOpenSettings)
            }
        }

        // ===== 管理入口（仅管理员）=====
        if (userType == "1") {
            SectionTitle("管理")
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                MoreRow(Icons.Filled.AdminPanelSettings, "管理中心", "随笔 · 博客 · 评论 · 站点概览", onOpenAdmin)
            }
        }
        } // Column
    } // PullRefresh

    // ===== 编辑资料对话框 =====
    if (showEditProfile) {
        ProfileEditDialog(
            current = vm.profile,
            fallbackName = displayName,
            fallbackAvatar = displayAvatar,
            isAdmin = userType == "1",
            vm = vm,
            onDismiss = { showEditProfile = false },
            onSaved = { user ->
                // 同步更新登录态（TokenStore 统一落盘，不再手工拼 DataStore 对象）
                TokenStore.updateProfile(user.nickname, user.avatar, userType, user.email)
            }
        )
    }
}

@Composable
private fun MoreRow(icon: ImageVector, title: String, desc: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(title, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(start = 12.dp).weight(1f))
        Text(desc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        Icon(Icons.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(start = 4.dp))
    }
}

/** 编辑个人资料（对齐网页 UserInfoForm）：头像/昵称 + 邮箱（改邮箱需验证码）+ 密码（md5 传输）
 *  → POST /user/current/update；管理员改邮箱免验证码。 */
@Composable
private fun ProfileEditDialog(
    current: User?,
    fallbackName: String,
    fallbackAvatar: String?,
    isAdmin: Boolean,
    vm: ProfileViewModel,
    onDismiss: () -> Unit,
    onSaved: (User) -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    var nickname by remember { mutableStateOf(current?.nickname ?: fallbackName) }
    var avatarUrl by remember { mutableStateOf(current?.avatar ?: fallbackAvatar ?: "") }
    // 输入框保留用户正在敲的原文；只有完整合法的 http(s) 地址才写进 avatarUrl（预览/保存用），
    // 避免半截地址把头像预览打空、或被当成头像提交。
    var avatarInput by remember { mutableStateOf(avatarUrl) }
    // 已有头像可能是站内相对路径，别一打开就报「地址无效」；只有用户改过才校验
    var avatarTouched by remember { mutableStateOf(false) }
    val currentEmail = current?.email?.trim().orEmpty()
    var email by remember { mutableStateOf(currentEmail) }
    var captcha by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var countdown by remember { mutableIntStateOf(0) }
    var sendingCaptcha by remember { mutableStateOf(false) }
    var uploading by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }

    // 验证码倒计时
    LaunchedEffect(countdown) {
        if (countdown > 0) { delay(1000); countdown-- }
    }

    val emailChanged = email.isNotBlank() && email.trim() != currentEmail
    val needCaptcha = emailChanged && !isAdmin

    val toast = rememberToast()

    fun requestCaptcha() {
        if (!isValidEmail(email)) {
            toast("请先填写正确的新邮箱")
            return
        }
        if (countdown > 0 || sendingCaptcha) return
        scope.launch {
            sendingCaptcha = true
            val ok = vm.sendGeneralCaptcha(email.trim())
            sendingCaptcha = false
            if (ok) countdown = 60 else toast("验证码发送失败，请稍后再试")
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            uploading = true
            scope.launch {
                val url = vm.uploadAvatar(uri)
                uploading = false
                if (url != null) {
                    avatarUrl = url
                    avatarInput = url
                    avatarTouched = false
                } else {
                    toast("头像上传失败")
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!saving && !uploading && !sendingCaptcha) onDismiss() },
        title = { Text("编辑资料") },
        text = {
            Column(
                // 顺序不能反：heightIn 在外限制视口，verticalScroll 在内负责滚动。
                // 之前写反了，滚动内容被钉死在 480dp，编辑资料弹窗内容看不全。
                Modifier
                    .heightIn(max = minOf(480.dp, LocalConfiguration.current.screenHeightDp.dp * 0.62f))
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    Modifier.clickable(enabled = !uploading) { picker.launch("image/*") },
                    contentAlignment = Alignment.Center
                ) {
                    Avatar(url = avatarUrl.ifBlank { null }, name = nickname.ifBlank { "友" }, size = 72.dp, feature = ImageCaches.Feature.PROFILE)
                    if (uploading) CircularProgressIndicator(Modifier.size(72.dp))
                }
                Text("点击头像从相册更换，或直接填头像地址", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)

                val avatarInvalid = avatarTouched && avatarInput.isNotBlank() && !UrlRules.isHttpUrl(avatarInput)
                OutlinedTextField(
                    value = avatarInput,
                    onValueChange = {
                        avatarTouched = true
                        avatarInput = it
                        avatarUrl = when {
                            it.isBlank() -> ""
                            UrlRules.isHttpUrl(it) -> UrlRules.normalize(it)
                            else -> avatarUrl
                        }
                    },
                    label = { Text("头像 URL（可选）") },
                    placeholder = { Text("https://example.com/avatar.jpg") },
                    singleLine = true,
                    isError = avatarInvalid,
                    supportingText = if (avatarInvalid) {
                        { Text("需为 http:// 或 https:// 开头的完整地址") }
                    } else null,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = nickname,
                    onValueChange = { nickname = it },
                    label = { Text("昵称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; captcha = "" },
                        label = { Text("邮箱") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(
                        onClick = { requestCaptcha() },
                        enabled = emailChanged && !isAdmin && !sendingCaptcha
                    ) { Text(if (countdown > 0) "重新发送(${countdown}s)" else if (emailChanged) "获取验证码" else "未修改") }
                }
                if (needCaptcha) {
                    OutlinedTextField(
                        value = captcha,
                        onValueChange = { captcha = it },
                        label = { Text("邮箱验证码（已发送到新邮箱）") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (!isAdmin) {
                    Text("修改邮箱需向新邮箱发送验证码", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                }

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("新密码（可选）") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("确认新密码") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                Text("密码留空则不改；至少 6 位且含字母和数字", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
        },
        confirmButton = {
            TextButton(
                enabled = !saving && !uploading && !sendingCaptcha && nickname.isNotBlank(),
                onClick = {
                    val pwd = password
                    if (pwd.isNotBlank()) {
                        passwordError(pwd)?.let { toast(it); return@TextButton }
                        if (pwd != confirmPassword) { toast("两次输入的密码不一致"); return@TextButton }
                    }
                    emailError(email)?.let { toast(it); return@TextButton }
                    if (needCaptcha && captcha.isBlank()) {
                        toast("修改邮箱需要填写验证码"); return@TextButton
                    }
                    val uid = TokenStore.userId.value
                    if (uid == null) {
                        toast("登录态已失效，请重新登录")
                        onDismiss()
                        return@TextButton
                    }
                    saving = true
                    val user = mutableMapOf("nickname" to nickname.trim(), "avatar" to avatarUrl)
                    if (emailChanged) user["email"] = email.trim()
                    vm.saveAccount(uid, user, if (needCaptcha) captcha.trim() else null, password = pwd) { saved ->
                        saving = false
                        if (saved != null) {
                            onSaved(saved)
                            onDismiss()
                        } else toast("保存失败，请稍后再试")
                    }
                }
            ) { Text(if (saving) "保存中…" else "保存") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving && !uploading && !sendingCaptcha) { Text("取消") }
        }
    )
}