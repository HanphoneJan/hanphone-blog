package com.hanphone.blog.data.chat

import com.hanphone.blog.data.push.PushNotifications

/**
 * 聊天消息本地通知（socket 实时私信）。
 *
 * App 与网页的关键差异：socket 长连接由进程级单例 [ChatSocket] 维持，
 * 用户离开消息页甚至退到后台时连接仍在——此时收到私信可弹系统通知，
 * 点通知拉起 App。仅私信触发；聊天室公共消息噪声大，暂不通知。
 *
 * 通知渠道与展示统一由 [PushNotifications] 负责（与 FCM 推送共用同一渠道）。
 */
object ChatNotifier {

    /** 收到私信时调用；仅当「消息页可见且 App 在前台」时由调用方抑制 */
    fun notifyPrivate(from: String, content: String) {
        PushNotifications.show(PushNotifications.CHANNEL_CHAT, from.hashCode(), from, content)
    }
}
