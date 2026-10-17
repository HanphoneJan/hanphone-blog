package com.example.blog.push;

/**
 * 一条 FCM 推送。
 *
 * @param title     通知标题
 * @param body      通知正文
 * @param type      {@code data.type}，决定 Android 通知渠道与处理分支（hot = 热点更新）
 * @param channelId Android 通知渠道 id
 */
public record PushMessage(String title, String body, String type, String channelId) {
}
