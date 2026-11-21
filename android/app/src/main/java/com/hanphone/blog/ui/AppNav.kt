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
import com.hanphone.blog.core.DeepLinkBus
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.auth.OAuthLogin
import com.hanphone.blog.data.chat.ChatSocket
import com.hanphone.blog.data.push.PushRegistrar
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
import com.hanphone.blog.ui.bookmark.BookmarksScreen
import com.hanphone.blog.ui.docs.DocsScreen
import com.hanphone.blog.ui.docs.DocMarkdownScreen
import com.hanphone.blog.ui.friendlinks.FriendLinksScreen
import com.hanphone.blog.ui.hot.HotScreen
import com.hanphone.blog.ui.login.LoginScreen
import com.hanphone.blog.ui.login.RegisterScreen
import com.hanphone.blog.ui.message.MessageScreen
import com.hanphone.blog.ui.notification.NotificationsScreen
import com.hanphone.blog.ui.profile.ProfileScreen
import com.hanphone.blog.ui.projects.ProjectsScreen
import com.hanphone.blog.ui.search.SearchScreen
import com.hanphone.blog.ui.settings.AppearanceScreen
import com.hanphone.blog.ui.settings.DataManagementScreen
import com.hanphone.blog.ui.settings.SettingsScreen
import com.hanphone.blog.ui.webview.WebViewScreen
import com.hanphone.blog.ui.theme.BlogTheme
import com.hanphone.blog.util.DeepLinkTarget
import kotlinx.coroutines.flow.first
import com.hanphone.blog.ui.components.rememberToast

@Composable
internal fun MainScaffold() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val toast = rememberToast()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = MainTab.entries.any { it.route == currentRoute }
    val selectedTab = MainTab.entries.firstOrNull { it.route == currentRoute }

    // 第三方登录从浏览器回来：成功就提示并收掉还开着的登录/注册页，失败说明原因
    // （登录态本身已由 OAuthLogin 写入，这里只管导航与反馈；不要监听 token 变化，
    //  否则密码登录的 onSuccess 会和这里双重 popBackStack）
    val oauthResult by OAuthLogin.lastResult.collectAsState()
    LaunchedEffect(oauthResult) {
        when (val r = oauthResult) {
            is OAuthLogin.Outcome.Success -> {
                toast("${OAuthLogin.label(r.provider)} 登录成功")
                if (currentRoute == "login" || currentRoute == "register") navController.popBackStack()
                OAuthLogin.clearResult()
            }
            is OAuthLogin.Outcome.Failure -> {
                toast(r.message)
                OAuthLogin.clearResult()
            }
            null -> Unit
        }
    }
    // 未读私信红点（管理员=各会话未读之和；普通用户=来自博主/AI 的未读）——只显示红点，不显示数量
    val adminUnread by ChatSocket.adminUnread.collectAsState()
    val hasUnread = adminUnread.values.any { it > 0 }
    // 键盘弹出时隐藏底部导航栏，让主 Tab（聊天/随笔内嵌等）底部输入能贴齐键盘顶
    val imeVisible = WindowInsets.ime.getBottom(LocalDensity.current) > 0

    // ===== 站内深链（App Links）=====
    // MainActivity 只投递 URL，这里统一导航：冷启动与 onNewIntent 走同一条路径；
    // launchSingleTop 保证已经在看同一篇文章时不会叠第二层。
    val pendingDeepLink by DeepLinkBus.pending.collectAsState()
    LaunchedEffect(pendingDeepLink) {
        val target = pendingDeepLink ?: return@LaunchedEffect
        when (target) {
            is DeepLinkTarget.Article ->
                navController.navigate("article/${target.id}") { launchSingleTop = true }
            is DeepLinkTarget.Essay ->
                navController.navigate("essay/${target.id}") { launchSingleTop = true }
            DeepLinkTarget.Docs ->
                navController.navigate("docs") { launchSingleTop = true }
            DeepLinkTarget.Essays ->
                navController.navigate(MainTab.ESSAY.route) {
                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                    launchSingleTop = true
                    restoreState = true
                }
        }
        DeepLinkBus.consume()
    }

    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            if (showBottomBar && !imeVisible) {
                Surface(shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
                    Row(
                        Modifier.fillMaxWidth()
                            .windowInsetsPadding(WindowInsets.navigationBars)
                            .height(54.dp)
                    ) {
                        MainTab.entries.forEach { tab ->
                            val selected = selectedTab == tab
                            Column(
                                Modifier.weight(1f).fillMaxSize().clickable {
                                    if (!selected) {
                                        navController.navigate(tab.route) {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                },
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically)
                            ) {
                                Box {
                                    Icon(
                                        tab.icon,
                                        contentDescription = tab.label,
                                        tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    // 「消息」Tab 未读红点（不显示数量）
                                    if (tab == MainTab.CHAT && hasUnread) {
                                        Box(
                                            Modifier
                                                .align(Alignment.TopEnd)
                                                .offset(x = 3.dp, y = (-1).dp)
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.error)
                                        )
                                    }
                                }
                                Text(
                                    tab.label,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = MainTab.HOME.route,
            modifier = Modifier.fillMaxSize().padding(padding),
            // 快速淡入淡出：页面切换不生硬（导航默认 700ms 过慢）
            enterTransition = { fadeIn(tween(200)) },
            exitTransition = { fadeOut(tween(150)) },
            popEnterTransition = { fadeIn(tween(200)) },
            popExitTransition = { fadeOut(tween(150)) }
        ) {
            composable(MainTab.HOME.route) {
                HomeScreen(
                    onOpenBlog = { id -> navController.navigate("article/$id") },
                    onSearch = { navController.navigate("search") }
                )
            }
            composable(MainTab.ESSAY.route) {
                EssayListScreen(
                    onOpenEssay = { id -> navController.navigate("essay/$id") },
                    onLogin = { navController.navigate("login") }
                )
            }
            composable(MainTab.CHAT.route) {
                ChatScreen(onLogin = { navController.navigate("login") })
            }
            composable(MainTab.PROFILE.route) {
                ProfileScreen(
                    onLogin = { navController.navigate("login") },
                    onOpenMessage = { navController.navigate("messages") },
                    onOpenFriendLinks = { navController.navigate("friendlinks") },
                    onOpenProjects = { navController.navigate("projects") },
                    onOpenDocs = { navController.navigate("docs") },
                    onOpenSettings = { navController.navigate("settings") },
                    onOpenInsight = { navController.navigate("insight") },
                    onOpenNotifications = { navController.navigate("notifications") },
                    onOpenBookmarks = { navController.navigate("bookmarks") },
                    onOpenPhotoWall = {
                        navController.navigate(
                            "webview?url=${Uri.encode("https://hanphone.cn/atlas/")}&title=${Uri.encode("照片墙")}"
                        )
                    },
                    onOpenAdmin = { navController.navigate("admin") }
                )
            }
            composable("messages") {
                MessageScreen(onBack = { navController.popBackStack() })
            }
            composable("friendlinks") {
                FriendLinksScreen(onBack = { navController.popBackStack() })
            }
            composable("projects") {
                ProjectsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenUrl = { url, title ->
                        navController.navigate(
                            "webview?url=${Uri.encode(url)}&title=${Uri.encode(title)}"
                        )
                    }
                )
            }
            composable("docs") {
                DocsScreen(
                    onBack = { navController.popBackStack() },
                    onLogin = { navController.navigate("login") },
                    onOpenWebView = { url, title ->
                        navController.navigate(
                            "webview?url=${Uri.encode(url)}&title=${Uri.encode(title)}&html=1"
                        )
                    },
                    onOpenMarkdown = { url, title ->
                        navController.navigate(
                            "doc-md?url=${Uri.encode(url)}&title=${Uri.encode(title)}"
                        )
                    }
                )
            }
            composable("notifications") {
                NotificationsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenArticle = { id -> navController.navigate("article/$id") },
                    onOpenEssay = { id -> navController.navigate("essay/$id") },
                    onLogin = { navController.navigate("login") }
                )
            }
            composable("bookmarks") {
                BookmarksScreen(
                    onBack = { navController.popBackStack() },
                    onOpenArticle = { id -> navController.navigate("article/$id") },
                    onOpenEssay = { id -> navController.navigate("essay/$id") },
                    onOpenDocs = { navController.navigate("docs") },
                    onLogin = { navController.navigate("login") }
                )
            }
            composable("insight") {
                HotScreen(
                    onBack = { navController.popBackStack() },
                    onOpenUrl = { url, title ->
                        navController.navigate(
                            "webview?url=${Uri.encode(url)}&title=${Uri.encode(title)}"
                        )
                    }
                )
            }
            composable(
                route = "doc-md?url={url}&title={title}",
                arguments = listOf(
                    navArgument("url") { type = NavType.StringType },
                    navArgument("title") { type = NavType.StringType; defaultValue = "" }
                )
            ) { entry ->
                DocMarkdownScreen(
                    url = entry.arguments?.getString("url").orEmpty(),
                    title = entry.arguments?.getString("title").orEmpty(),
                    onBack = { navController.popBackStack() }
                )
            }
            composable(
                route = "webview?url={url}&title={title}&html={html}",
                arguments = listOf(
                    navArgument("url") { type = NavType.StringType },
                    navArgument("title") { type = NavType.StringType; defaultValue = "" },
                    navArgument("html") { type = NavType.StringType; defaultValue = "0" }
                )
            ) { entry ->
                WebViewScreen(
                    url = entry.arguments?.getString("url").orEmpty(),
                    title = entry.arguments?.getString("title").orEmpty(),
                    loadAsHtml = entry.arguments?.getString("html") == "1",
                    onBack = { navController.popBackStack() }
                )
            }
            composable("settings") {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenAppearance = { navController.navigate("settings/appearance") },
                    onOpenData = { navController.navigate("settings/data") }
                )
            }
            composable("settings/appearance") {
                AppearanceScreen(onBack = { navController.popBackStack() })
            }
            composable("settings/data") {
                DataManagementScreen(onBack = { navController.popBackStack() })
            }


            // ===== 后台管理（入口仅管理员可见）=====
            composable("admin") {
                AdminHomeScreen(
                    onBack = { navController.popBackStack() },
                    onOpenDashboard = { navController.navigate("admin/dashboard") },
                    onOpenVisitors = { navController.navigate("admin/visitors") },
                    onOpenEssays = { navController.navigate("admin/essays") },
                    onOpenBlogs = { navController.navigate("admin/blogs") },
                    onOpenComments = { navController.navigate("admin/comments") },
                    onOpenTags = { navController.navigate("admin/tags") },
                    onOpenTypes = { navController.navigate("admin/types") },
                    onOpenFriendLinks = { navController.navigate("admin/friendlinks") },
                    onOpenProjects = { navController.navigate("admin/projects") },
                    onOpenDocs = { navController.navigate("admin/docs") },
                    onOpenUsers = { navController.navigate("admin/users") },
                    onOpenInsight = { navController.navigate("admin/insight") }
                )
            }
            composable("admin/dashboard") {
                AdminDashboardScreen(
                    onBack = { navController.popBackStack() },
                    onOpenVisitors = { navController.navigate("admin/visitors") }
                )
            }
            composable("admin/visitors") {
                AdminVisitorsScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/essays") {
                AdminEssaysScreen(
                    onBack = { navController.popBackStack() },
                    onCreate = { navController.navigate("admin/essay/edit/0") },
                    onEdit = { essay -> navController.navigate("admin/essay/edit/${essay.id}") }
                )
            }
            composable(
                route = "admin/essay/edit/{essayId}",
                arguments = listOf(navArgument("essayId") { type = NavType.LongType })
            ) {
                AdminEssayEditScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable("admin/blogs") {
                AdminBlogsScreen(
                    onBack = { navController.popBackStack() },
                    onCreate = { navController.navigate("admin/blog/edit/0") },
                    onEdit = { blog -> navController.navigate("admin/blog/edit/${blog.id}") }
                )
            }
            composable(
                route = "admin/blog/edit/{blogId}",
                arguments = listOf(navArgument("blogId") { type = NavType.LongType })
            ) {
                AdminBlogEditScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable("admin/comments") {
                AdminCommentsScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/tags") {
                AdminTagsScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/types") {
                AdminTypesScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/friendlinks") {
                AdminFriendLinksScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/projects") {
                AdminProjectsScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/docs") {
                AdminDocsScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/users") {
                AdminUsersScreen(onBack = { navController.popBackStack() })
            }
            composable("admin/insight") {
                AdminInsightScreen(onBack = { navController.popBackStack() })
            }
            composable("search") {
                SearchScreen(
                    onOpenBlog = { id -> navController.navigate("article/$id") },
                    onOpenEssay = { id -> navController.navigate("essay/$id") },
                    onBack = { navController.popBackStack() }
                )
            }
            composable("login") {
                LoginScreen(
                    onBack = { navController.popBackStack() },
                    onSuccess = { navController.popBackStack() },
                    onRegister = { navController.navigate("register") }
                )
            }
            composable("register") {
                RegisterScreen(
                    onBack = { navController.popBackStack() },
                    onSuccess = { navController.popBackStack() }
                )
            }
            composable(
                route = "article/{blogId}",
                arguments = listOf(navArgument("blogId") { type = NavType.LongType })
            ) { entry ->
                ArticleDetailScreen(
                    blogId = entry.arguments?.getLong("blogId") ?: 0L,
                    onBack = { navController.popBackStack() },
                    onLogin = { navController.navigate("login") }
                )
            }
            composable(
                route = "essay/{essayId}",
                arguments = listOf(navArgument("essayId") { type = NavType.LongType })
            ) { entry ->
                EssayDetailScreen(
                    essayId = entry.arguments?.getLong("essayId") ?: 0L,
                    onBack = { navController.popBackStack() },
                    onLogin = { navController.navigate("login") }
                )
            }
        }
    }
}