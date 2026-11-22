package com.hanphone.blog.ui

import android.app.Activity
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.core.content.ContextCompat
import com.hanphone.blog.core.auth
import com.hanphone.blog.core.backgroundBlur
import com.hanphone.blog.core.backgroundPath
import com.hanphone.blog.core.themeMode
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.auth.OAuthLogin
import com.hanphone.blog.data.chat.ChatSocket
import com.hanphone.blog.data.push.PushRegistrar
import com.hanphone.blog.data.cache.BookmarkStore
import com.hanphone.blog.data.cache.NotificationBadge
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.data.update.AppUpdateManager
import com.hanphone.blog.ui.components.UpdateDialogs
import com.hanphone.blog.ui.essay.EssayDetailScreen
import com.hanphone.blog.ui.essay.EssayListScreen
import com.hanphone.blog.ui.home.HomeScreen
import com.hanphone.blog.ui.detail.ArticleDetailScreen
import com.hanphone.blog.ui.admin.AdminBlogEditScreen
import com.hanphone.blog.ui.admin.AdminBlogsScreen
import com.hanphone.blog.ui.admin.AdminCommentsScreen
import com.hanphone.blog.ui.admin.AdminDashboardScreen
import com.hanphone.blog.ui.admin.AdminDocsScreen
import com.hanphone.blog.ui.admin.AdminEssayEditScreen
import com.hanphone.blog.ui.admin.AdminEssaysScreen
import com.hanphone.blog.ui.admin.AdminFriendLinksScreen
import com.hanphone.blog.ui.admin.AdminHomeScreen
import com.hanphone.blog.ui.admin.AdminInsightScreen
import com.hanphone.blog.ui.admin.AdminProjectsScreen
import com.hanphone.blog.ui.admin.AdminTagsScreen
import com.hanphone.blog.ui.admin.AdminTypesScreen
import com.hanphone.blog.ui.admin.AdminUsersScreen
import com.hanphone.blog.ui.admin.AdminVisitorsScreen
import com.hanphone.blog.core.clearAuth
import com.hanphone.blog.data.auth.TokenRefresher
import com.hanphone.blog.util.Jwt
import com.hanphone.blog.ui.chat.ChatScreen
import com.hanphone.blog.ui.docs.DocsScreen
import com.hanphone.blog.ui.docs.DocMarkdownScreen
import com.hanphone.blog.ui.friendlinks.FriendLinksScreen
import com.hanphone.blog.ui.hot.HotScreen
import com.hanphone.blog.ui.login.LoginScreen
import com.hanphone.blog.ui.login.RegisterScreen
import com.hanphone.blog.ui.message.MessageScreen
import com.hanphone.blog.ui.profile.ProfileScreen
import com.hanphone.blog.ui.projects.ProjectsScreen
import com.hanphone.blog.ui.search.SearchScreen
import com.hanphone.blog.ui.settings.AppearanceScreen
import com.hanphone.blog.ui.settings.DataManagementScreen
import com.hanphone.blog.ui.settings.SettingsScreen
import com.hanphone.blog.ui.webview.WebViewScreen
import com.hanphone.blog.ui.theme.BlogTheme
import kotlinx.coroutines.flow.first
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.data.auth.SessionSnapshot

enum class MainTab(val route: String, val label: String, val icon: ImageVector) {
    HOME("home", "首页", Icons.Filled.Home),
    ESSAY("essay", "随笔", Icons.Filled.Edit),
    CHAT("chat", "消息", Icons.Filled.Email),
    PROFILE("profile", "我的", Icons.Filled.Person)
}

/** App 根：读取主题设置 → 应用主题 → 主脚手架 */
@Composable
fun BlogAppRoot() {
    val context = LocalContext.current
    val themeMode by context.themeMode.collectAsState(initial = "system")
    val bgPath by context.backgroundPath.collectAsState(initial = null)
    val bgBlur by context.backgroundBlur.collectAsState(initial = 10)
    val darkTheme = when (themeMode) {
        "light" -> false
        "dark" -> true
        else -> isSystemInDarkTheme()
    }

    // 状态栏 / 导航栏图标明暗必须跟随 App 主题，而不是系统深色模式：
    // App 支持「手动黑夜」而系统是浅色，enableEdgeToEdge() 的默认 auto 会让状态栏
    // 保持深色图标 → 黑底黑字，连手机时间都看不见（2026-11 用户反馈）。
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }
    // 恢复持久化登录态到内存 TokenStore（OkHttp 拦截器依赖）
    LaunchedEffect(Unit) {
        // 第三方登录回跳可能在启动瞬间就建好了会话（见 data/auth/OAuthLogin.kt）：
        // 此时内存里已有新会话，别再用磁盘上的旧值（可能为空）覆盖它。
        if (TokenStore.token.value != null) return@LaunchedEffect
        val auth = context.auth.first()
        // 先恢复（含 refresh），再决定要不要续期
        TokenStore.restore(
            SessionSnapshot(
                token = auth.token,
                userId = auth.userId,
                nickname = auth.nickname,
                avatar = auth.avatar,
                userType = auth.userType,
                username = auth.username,
                refreshToken = auth.refreshToken,
                email = auth.email
            )
        )
        if (Jwt.isExpired(auth.token, skewSeconds = 120)) {
            // access 过期：用 refresh 静默续期；没有 refresh 或续期失败才退回未登录
            val newToken = if (auth.refreshToken.isNullOrBlank()) {
                null
            } else {
                TokenRefresher.refresh(auth.token)
            }
            if (newToken == null) {
                context.clearAuth()
                TokenStore.clear()
            }
        }
    }

    val token by TokenStore.token.collectAsState()

    // 登录态建立后即常连聊天 socket：不必先打开消息页，离开消息页/退到后台也能收到私信并弹系统通知
    LaunchedEffect(token) {
        val t = token
        if (t != null) ChatSocket.connect(t) else ChatSocket.disconnect()
    }

    // 收藏状态与通知未读数跟随登录态：登录后拉一次全量收藏，退出登录清空
    LaunchedEffect(token) {
        if (token == null) {
            BookmarkStore.clear()
            NotificationBadge.clear()
        } else {
            BookmarkStore.refresh()
        }
    }

    // 通知权限（Android 13+）：启动即请求（热点更新推送对未登录用户也生效；拒绝也不影响功能）
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            permLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // FCM 设备令牌同步：已登录关联用户（收私信推送），未登录为匿名（仅收热点推送）
    LaunchedEffect(token) {
        PushRegistrar.sync(context)
    }

    // 启动检查更新：设置里可关（默认开）；每进程一次，失败静默，有新版本由 UpdateDialogs 弹窗提示
    LaunchedEffect(Unit) {
        AppUpdateManager.checkOnStartup(context)
    }

    // 管理员：启动即预取收件箱未读数，底部「消息」红点在冷启动时也能正确显示
    LaunchedEffect(token) {
        val t = token
        if (t != null && TokenStore.userType.value == "1") {
            kotlin.runCatching { BlogRepository().chatUnread(t) }.onSuccess { resp ->
                if (resp.success) ChatSocket.cacheAdminUnread(resp.unread, fromRemote = true)
            }
        }
    }

    BlogTheme(darkTheme = darkTheme) {
        // contentColor 显式提供：MainScaffold 的 Scaffold 是 Transparent 容器，
        // 不修 LocalContentColor 会回退成黑色，深色主题下裸 Text 全部隐形
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.onBackground
        ) {
            Box(Modifier.fillMaxSize()) {
                AppBackground(bgPath = bgPath, blurRadius = bgBlur, modifier = Modifier.fillMaxSize())
                MainScaffold()
                // 更新弹窗挂在根界面：启动检查与设置页手动检查共用，切页/旋转不丢
                UpdateDialogs()
            }
        }
    }
}
