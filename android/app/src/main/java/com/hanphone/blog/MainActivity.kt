package com.hanphone.blog

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.hanphone.blog.data.auth.OAuthLogin
import com.hanphone.blog.data.chat.ChatSocket
import com.hanphone.blog.data.push.PushRegistrar
import com.hanphone.blog.ui.BlogAppRoot
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** 已处理过的一次性 code：配置变更/重复投递时不重复兑换（兑换是一次性的，第二次必然失败） */
    private var handledOAuthCode: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BlogAppRoot()
        }
        // 冷启动即被授权回跳拉起；savedInstanceState != null 表示重建/进程恢复，不重复兑换
        if (savedInstanceState == null) handleOAuthIntent(intent)
    }

    /** 浏览器授权完成后通过 hanphone://oauth/callback 回到 App（Manifest 里 singleTop + intent-filter） */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleOAuthIntent(intent)
    }

    private fun handleOAuthIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (!OAuthLogin.isCallback(uri)) return

        val error = uri.getQueryParameter("error")
        if (!error.isNullOrBlank()) {
            OAuthLogin.failed(if (error == "access_denied") "已取消授权" else "授权失败，请重试")
            return
        }

        val code = uri.getQueryParameter("code")
        if (code.isNullOrBlank() || code == handledOAuthCode) return
        handledOAuthCode = code

        val provider = uri.getQueryParameter("provider") ?: OAuthLogin.GITHUB
        appScope.launch { OAuthLogin.exchange(applicationContext, provider, code) }
    }

    // 前台状态：后台时即使停在消息页也应弹私信系统通知（对齐常见 App）
    override fun onResume() {
        super.onResume()
        ChatSocket.appInForeground = true
        // 前台恢复时限流补报 FCM token：首次因网络（如需代理）失败后，恢复网络可自动补上
        appScope.launch { PushRegistrar.syncIfStale(applicationContext) }
    }

    override fun onPause() {
        super.onPause()
        ChatSocket.appInForeground = false
    }

    override fun onDestroy() {
        super.onDestroy()
        appScope.cancel()
    }
}
