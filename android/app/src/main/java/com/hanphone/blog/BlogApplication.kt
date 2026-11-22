package com.hanphone.blog

import android.app.Application
import com.hanphone.blog.core.AuthData
import com.hanphone.blog.core.saveAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ContentStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.push.PushNotifications
import dagger.hilt.android.HiltAndroidApp

/**
 * 应用入口：初始化进程级单例的依赖。
 * - ContentStore：冷启动内容缓存（磁盘）
 * - ImageCaches：按功能/页面分区的持久化磁盘图片缓存（头像/封面等写入 filesDir，冷启动秒显）
 * - PushNotifications：通知渠道（聊天消息 + 热点更新），socket 与 FCM 推送共用
 * - @HiltAndroidApp：依赖注入容器（VM/Repository 均由 Hilt 提供）
 */
@HiltAndroidApp
class BlogApplication : Application() {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        // 登录/资料更新/静默续期都经 TokenStore 这一个入口，这里负责落盘（网络层不持有 Context）
        TokenStore.persistSnapshot = { snapshot ->
            appScope.launch {
                saveAuth(
                    AuthData(
                        token = snapshot.token,
                        userId = snapshot.userId,
                        nickname = snapshot.nickname,
                        avatar = snapshot.avatar,
                        userType = snapshot.userType,
                        username = snapshot.username,
                        refreshToken = snapshot.refreshToken,
                        email = snapshot.email
                    )
                )
            }
        }
        ContentStore.init(this)
        ImageCaches.init(this)
        PushNotifications.init(this)
    }
}
