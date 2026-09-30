package com.hanphone.blog.ui

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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import android.net.Uri
import com.hanphone.blog.core.auth
import com.hanphone.blog.core.backgroundBlur
import com.hanphone.blog.core.backgroundPath
import com.hanphone.blog.core.themeMode
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.ui.essay.EssayDetailScreen
import com.hanphone.blog.ui.essay.EssayListScreen
import com.hanphone.blog.ui.home.HomeScreen
import com.hanphone.blog.ui.detail.ArticleDetailScreen
import com.hanphone.blog.ui.chat.ChatScreen
import com.hanphone.blog.ui.docs.DocsScreen
import com.hanphone.blog.ui.docs.DocMarkdownScreen
import com.hanphone.blog.ui.friendlinks.FriendLinksScreen
import com.hanphone.blog.ui.login.LoginScreen
import com.hanphone.blog.ui.login.RegisterScreen
import com.hanphone.blog.ui.message.MessageScreen
import com.hanphone.blog.ui.profile.ProfileScreen
import com.hanphone.blog.ui.projects.ProjectsScreen
import com.hanphone.blog.ui.search.SearchScreen
import com.hanphone.blog.ui.settings.SettingsScreen
import com.hanphone.blog.ui.webview.WebViewScreen
import com.hanphone.blog.ui.theme.BlogTheme
import kotlinx.coroutines.flow.first

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
    // 恢复持久化登录态到内存 TokenStore（OkHttp 拦截器依赖）
    LaunchedEffect(Unit) {
        val auth = context.auth.first()
        TokenStore.restore(auth.token, auth.userId, auth.nickname, auth.avatar, auth.userType)
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
            }
        }
    }
}

@Composable
private fun MainScaffold() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = MainTab.entries.any { it.route == currentRoute }
    val selectedTab = MainTab.entries.firstOrNull { it.route == currentRoute }

    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            if (showBottomBar) {
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
                                Icon(
                                    tab.icon,
                                    contentDescription = tab.label,
                                    tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(24.dp)
                                )
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
                    onOpenSettings = { navController.navigate("settings") }
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
                    onLogin = { navController.navigate("login") }
                )
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