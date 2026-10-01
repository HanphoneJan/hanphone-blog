package com.hanphone.blog.data.chat

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
 * 聊天消息本地通知。
 *
 * App 与网页的关键差异：socket 长连接由进程级单例 [ChatSocket] 维持，
 * 用户离开消息页甚至退到后台时连接仍在——此时收到私信可弹系统通知，
 * 点通知拉起 App。依赖：
 * - POST_NOTIFICATIONS 权限（Android 13+，消息页首次进入时请求）
 * - Application.onCreate 调用 [init] 创建通知渠道
 *
 * 仅私信触发通知；聊天室公共消息噪声大，暂不通知。
 */
object ChatNotifier {

    private const val CHANNEL_ID = "chat_messages"
    private const val CHANNEL_NAME = "聊天消息"

    private var appContext: Context? = null

    /** 在 Application.onCreate 中调用 */
    fun init(context: Context) {
        appContext = context.applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "私信与聊天室消息提醒" }
            appContext?.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    fun canNotify(): Boolean {
        val ctx = appContext ?: return false
        return NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    /** 收到私信时调用；App 前台且消息页可见时由调用方负责抑制 */
    fun notifyPrivate(from: String, content: String) {
        val ctx = appContext ?: return
        val nm = NotificationManagerCompat.from(ctx)
        if (!nm.areNotificationsEnabled()) return

        val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pending = PendingIntent.getActivity(
            ctx,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(from)
            .setContentText(content)
            .setStyle(NotificationCompat.BigTextStyle().bigText(content))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .build()

        runCatching { nm.notify(from.hashCode(), notification) } // 无权限时可能抛 SecurityException
    }
}
