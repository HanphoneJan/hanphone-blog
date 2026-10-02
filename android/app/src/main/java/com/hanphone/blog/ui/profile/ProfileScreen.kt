package com.hanphone.blog.ui.profile

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.R
import com.hanphone.blog.core.AuthBridge
import com.hanphone.blog.core.AuthData
import com.hanphone.blog.core.clearAuth
import com.hanphone.blog.core.saveAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.model.User
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.SectionTitle
import com.hanphone.blog.util.md5Hex
import com.hanphone.blog.util.resolveImageUrl
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** 我的：概览页（登录态/统计）+ 更多入口（项目/文库/留言板/友链/设置）；关于信息已移入设置页 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogin: () -> Unit,
    onOpenMessage: () -> Unit,
    onOpenFriendLinks: () -> Unit,
    onOpenProjects: () -> Unit,
    onOpenDocs: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenPhotoWall: () -> Unit
) {
    val vm: ProfileViewModel = hiltViewModel()
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val stats = vm.stats
    val visits = vm.visits
    val token by TokenStore.token.collectAsState()
    val userId by TokenStore.userId.collectAsState()
    val userName by TokenStore.nickname.collectAsState()
    val userAvatar by TokenStore.avatar.collectAsState()
    val userType by TokenStore.userType.collectAsState()
    var showEditProfile by remember { mutableStateOf(false) }

    // 登录态变化时拉取完整资料（头像/昵称/用户名）
    LaunchedEffect(userId) { vm.loadProfile(userId) }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    // 展示优先级：网络资料 > 本地登录态缓存
    val displayName = vm.profile?.nickname?.takeIf { it.isNotBlank() } ?: (userName ?: "云林访客")
    val displayAvatar = vm.profile?.avatar ?: userAvatar
    val displayUsername = vm.profile?.username ?: ""

    PullToRefreshBox(
        isRefreshing = vm.refreshing,
        onRefresh = { vm.refresh(fromPull = true) },
        modifier = Modifier.fillMaxSize()
    ) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
        // ===== 头部 =====
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            if (token != null) {
                // 登录：真实头像 + 昵称 + 用户名，点击编辑资料
                Box(
                    Modifier.clickable { showEditProfile = true },
                    contentAlignment = Alignment.Center
                ) {
                    Avatar(url = displayAvatar, name = displayName, size = 72.dp, feature = ImageCaches.Feature.PROFILE)
                }
                Text(displayName, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 10.dp))
                // 用户名行固定占位：网络资料加载出来后出现 @用户名 时不再顶动下方内容（防抖动）
                Box(Modifier.height(20.dp), contentAlignment = Alignment.Center) {
                    if (displayUsername.isNotBlank()) {
                        Text("@$displayUsername", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Text(
                    "点击头像可修改资料",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 4.dp).clickable { showEditProfile = true }
                )
            } else {
                // 未登录：博客图标占位（对齐网站图标，不再用文字「云」）
                Image(
                    painter = painterResource(R.drawable.ic_blog),
                    contentDescription = "云林有风",
                    modifier = Modifier.size(72.dp).clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Text("云林有风", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 10.dp))
                Text("Hanphone 的个人博客 · 记录与分享", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // ===== 登录状态 =====
        if (token == null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("未登录", style = MaterialTheme.typography.titleMedium)
                        Text("登录后可聊天、点赞、评论", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    TextButton(onClick = onLogin) { Text("登录") }
                }
            }
        } else {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Avatar(url = resolveImageUrl(userAvatar), name = userName ?: "友", size = 48.dp, feature = ImageCaches.Feature.PROFILE)
                    Column(Modifier.weight(1f)) {
                        Text(userName ?: "用户", style = MaterialTheme.typography.titleMedium)
                        Text("已登录", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    OutlinedButton(onClick = {
                        scope.launch {
                            context.clearAuth()
                            TokenStore.clear()
                            // 第一方 WebView（照片墙）把登录态存在自己的 localStorage 里，
                            // 不清的话退出登录后照片墙仍显示已登录、还能点赞/进管理页
                            AuthBridge.clearWebStorage()
                        }
                    }) { Text("退出") }
                }
            }
        }

        // ===== 站点统计 =====
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    StatItem((stats?.blogCount ?: 0).toString(), "博客")
                    StatItem((stats?.essayCount ?: 0).toString(), "随笔")
                    StatItem((stats?.projectCount ?: 0).toString(), "项目")
                    StatItem((stats?.messageCount ?: 0).toString(), "留言")
                    StatItem((stats?.docCount ?: 0).toString(), "文档")
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("累计访问量", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text((visits ?: 0).toString(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // ===== 更多功能入口 =====
        SectionTitle("更多")
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column {
                MoreRow(Icons.Filled.Build, "项目", "完整项目 · 工具箱 · 小游戏", onOpenProjects)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.List, "文库", "文件 · 教程 · 参考资料", onOpenDocs)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.PhotoLibrary, "照片墙", "云林有风的影像记录", onOpenPhotoWall)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.Email, "留言板", "给博主留言", onOpenMessage)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.Share, "友链", "小伙伴的博客", onOpenFriendLinks)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                MoreRow(Icons.Filled.Settings, "设置", "外观 · 缓存 · 更新", onOpenSettings)
            }
        }
        } // Column
    } // PullToRefreshBox

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
                // 同步更新登录态展示（内存 + DataStore 持久化）
                TokenStore.restore(token, userId, user.nickname, user.avatar, userType)
                scope.launch {
                    context.saveAuth(
                        AuthData(
                            token = token,
                            userId = userId,
                            nickname = user.nickname,
                            avatar = user.avatar,
                            userType = userType,
                            username = user.username
                        )
                    )
                }
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

@Composable
private fun StatItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun requestCaptcha() {
        if (!Regex("""^[^@\s]+@[^@\s]+\.[^@\s]+$""").matches(email.trim())) {
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
                Modifier.verticalScroll(rememberScrollState()).heightIn(max = 480.dp),
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
                Text("点击头像更换（自动上传）", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)

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
                        if (pwd.length < 6) { toast("密码长度不能少于 6 位"); return@TextButton }
                        if (!Regex("""^(?=.*[a-zA-Z])(?=.*\d).+$""").matches(pwd)) {
                            toast("密码必须包含字母和数字"); return@TextButton
                        }
                        if (pwd != confirmPassword) { toast("两次输入的密码不一致"); return@TextButton }
                    }
                    if (!Regex("""^[^@\s]+@[^@\s]+\.[^@\s]+$""").matches(email.trim())) {
                        toast("请输入有效的邮箱地址"); return@TextButton
                    }
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
                    if (pwd.isNotBlank()) user["password"] = md5Hex(pwd)
                    vm.saveAccount(uid, user, if (needCaptcha) captcha.trim() else null) { saved ->
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