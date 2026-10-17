package com.hanphone.blog.data.push

import android.content.Context
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.data.repo.BlogRepository
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * FCM 令牌管理：取 token → 上报后端（hanphone-chat）。
 *
 * 未放置 `android/app/google-services.json` 时（FirebaseApp 未初始化 / [BuildConfig.FCM_CONFIGURED]=false）
 * 整体静默跳过，其它功能不受影响。
 */
object PushRegistrar {

    private const val PREFS = "fcm_push"
    private const val KEY_LAST_TOKEN = "last_token"
    private const val KEY_LAST_SYNC = "last_sync_at"
    private const val SYNC_THROTTLE_MS = 10 * 60 * 1000L

    /** Firebase 是否可用（已放 google-services.json 且设备有 Google 服务） */
    fun isAvailable(context: Context): Boolean {
        if (!BuildConfig.FCM_CONFIGURED) return false
        return runCatching { FirebaseApp.getApps(context).isNotEmpty() }.getOrDefault(false)
    }

    /** 取当前 FCM token（未配置 / 无 Google 服务时返回 null） */
    private suspend fun currentToken(): String? = withContext(Dispatchers.IO) {
        runCatching { Tasks.await(FirebaseMessaging.getInstance().token) }
            .getOrNull()?.takeIf { it.isNotBlank() }
    }

    /**
     * 同步设备令牌到后端：已登录关联用户（可收私信推送），未登录为匿名（仅收热点广播推送）。
     * 任何异常都静默忽略，不影响主流程。
     */
    suspend fun sync(context: Context, repo: BlogRepository = BlogRepository()) {
        if (!isAvailable(context)) return
        markSynced(context)
        val token = currentToken() ?: return
        runCatching { repo.registerDevice(token) }         // chat-server：私信推送
        runCatching { repo.registerDeviceToBlog(token) }   // 博客 server：热点推送
        remember(context, token)
    }

    /**
     * 前台恢复时调用：限流（默认 10 分钟）尝试一次上报。
     * 用于「首次取 token 因网络（如需要代理/梯子）失败，恢复网络后自动补报」。
     */
    suspend fun syncIfStale(context: Context, repo: BlogRepository = BlogRepository()) {
        val last = prefs(context).getLong(KEY_LAST_SYNC, 0L)
        if (System.currentTimeMillis() - last < SYNC_THROTTLE_MS) return
        sync(context, repo)
    }

    /** 移除设备令牌（关闭通知 / 清除数据） */
    suspend fun unregister(context: Context, repo: BlogRepository = BlogRepository()) {
        val token = lastToken(context) ?: return
        runCatching { repo.removeDevice(token) }
        runCatching { repo.removeDeviceFromBlog(token) }
        clear(context)
    }

    fun remember(context: Context, token: String) {
        prefs(context).edit().putString(KEY_LAST_TOKEN, token).apply()
    }

    fun lastToken(context: Context): String? = prefs(context).getString(KEY_LAST_TOKEN, null)

    private fun markSynced(context: Context) {
        prefs(context).edit().putLong(KEY_LAST_SYNC, System.currentTimeMillis()).apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_LAST_TOKEN).remove(KEY_LAST_SYNC).apply()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
