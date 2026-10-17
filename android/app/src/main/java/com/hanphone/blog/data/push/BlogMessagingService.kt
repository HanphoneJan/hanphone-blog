package com.hanphone.blog.data.push

import com.hanphone.blog.data.repo.BlogRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * FCM 消息接收。
 *
 * - App 在前台：`onMessageReceived` 自行展示通知（后台/进程被杀时，通知消息由系统按渠道自动展示）。
 * - `onNewToken`：令牌轮换后立即重新上报后端。
 *
 * 未放置 google-services.json 时本 Service 不会被调用（FCM 未初始化）。
 */
class BlogMessagingService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        PushRegistrar.remember(applicationContext, token)
        scope.launch {
            runCatching { BlogRepository().registerDevice(token) }        // chat-server：私信推送
            runCatching { BlogRepository().registerDeviceToBlog(token) }  // 博客 server：热点推送
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"]
        val title = message.notification?.title ?: message.data["title"]
        val body = message.notification?.body ?: message.data["body"] ?: ""

        if (type == "hot") {
            PushNotifications.show(
                PushNotifications.CHANNEL_HOT,
                HOT_NOTIFICATION_ID,
                title ?: "热点已更新",
                body.ifBlank { "热点聚合数据已刷新，点击查看" }
            )
        } else {
            PushNotifications.show(
                PushNotifications.CHANNEL_CHAT,
                (title ?: "新私信").hashCode(),
                title ?: "新私信",
                body
            )
        }
    }

    private companion object {
        const val HOT_NOTIFICATION_ID = 0x484F54 // 'HOT'
    }
}
