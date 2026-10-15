package com.hanphone.blog.data.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.hanphone.blog.R

/**
 * 推送/本地通知的统一入口（通知渠道 + 展示）。
 *
 * 渠道：
 * - [CHANNEL_CHAT]  聊天消息（私信；socket 与 FCM 共用）
 * - [CHANNEL_HOT]   热点更新（blog 采集完成后的 FCM 广播）
 *
 * 通知点击统一拉起 App（MainActivity）。
 */
object PushNotifications {

    const val CHANNEL_CHAT = "chat_messages"
    const val CHANNEL_HOT = "hot_updates"

    private var appContext: Context? = null

    /** 在 Application.onCreate 中调用：创建通知渠道 */
    fun init(context: Context) {
        appContext = context.applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = appContext?.getSystemService(NotificationManager::class.java) ?: return
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_CHAT, "聊天消息", NotificationManager.IMPORTANCE_DEFAULT)
                    .apply { description = "私信与聊天室消息提醒" }
            )
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_HOT, "热点更新", NotificationManager.IMPORTANCE_DEFAULT)
                    .apply { description = "热点聚合（洞察）数据更新提醒" }
            )
        }
    }

    fun canNotify(): Boolean {
        val ctx = appContext ?: return false
        return NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    /** 展示一条通知；相同 id 会覆盖，channelId 决定归属渠道 */
    fun show(channelId: String, id: Int, title: String, body: String) {
        val ctx = appContext ?: return
        if (!canNotify()) return

        val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val builder = NotificationCompat.Builder(ctx, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)

        if (launch != null) {
            val pending = PendingIntent.getActivity(
                ctx,
                id,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.setContentIntent(pending)
        }

        // 无 POST_NOTIFICATIONS 权限时可能抛 SecurityException
        runCatching { NotificationManagerCompat.from(ctx).notify(id, builder.build()) }
    }
}
