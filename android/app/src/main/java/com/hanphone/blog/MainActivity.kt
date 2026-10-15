package com.hanphone.blog

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BlogAppRoot()
        }
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
