package com.hanphone.blog

import android.app.Application
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.chat.ChatNotifier
import dagger.hilt.android.HiltAndroidApp

/**
 * 应用入口：初始化进程级单例的依赖。
 * - ContentStore：冷启动内容缓存（磁盘）
 * - ChatNotifier：聊天消息通知渠道
 * - @HiltAndroidApp：依赖注入容器（VM/Repository 均由 Hilt 提供）
 */
@HiltAndroidApp
class BlogApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ContentStore.init(this)
        ChatNotifier.init(this)
    }
}
