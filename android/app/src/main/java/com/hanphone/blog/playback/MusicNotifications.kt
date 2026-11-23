package com.hanphone.blog.playback

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * 音乐播放通知（前台服务常驻通知）的渠道。
 *
 * 重要性 LOW：不出声、不弹横幅、不显示角标；控制按钮本身仍可在通知栏/锁屏操作。
 * 渠道在 Application 启动与 Service.onCreate 各建一次（幂等），避免通知先于渠道创建。
 */
object MusicNotifications {

    const val CHANNEL_ID = "music_playback"

    /** 固定通知 id：同一首歌切换/更新只覆盖这一条 */
    const val NOTIFICATION_ID = 0x4D55

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "正在播放", NotificationManager.IMPORTANCE_LOW).apply {
                description = "音乐库的后台播放控制条"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
        )
    }
}
