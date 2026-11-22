package com.hanphone.blog.util

import android.util.Base64
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * JWT 过期判断（只读 payload 里的 `exp`，不验签）。
 *
 * 为什么要这个：后端只对 admin 路径与聊天接口校验 token，公开接口完全不看。
 * 所以 token 过期后 App 表面上仍是「已登录」（昵称/头像来自 DataStore 缓存），
 * 直到用户点进管理中心或私信才收到 401 —— 表现成「列表空白 / 连接失败」，
 * 很容易被误判成功能坏了。启动时先判断一次，过期就直接退回未登录态。
 *
 * 另外 Web 端（Next 的 UserContext）读 localStorage 的 `expire` 判断登录态，
 * 第一方 WebView 注入登录态时要用 [expireIso] 把同一个 exp 一起写进去。
 */
object Jwt {

    /** 允许的时钟误差（秒） */
    private const val SKEW_SECONDS = 60L

    fun isExpired(token: String?, skewSeconds: Long = SKEW_SECONDS): Boolean {
        val exp = expSeconds(token) ?: return false
        return System.currentTimeMillis() / 1000 > exp - skewSeconds
    }

    /** 从 payload 读 `exp`（Unix 秒）；拿不到返回 null（不当作过期） */
    fun expSeconds(token: String?): Long? {
        if (token.isNullOrBlank()) return null
        val payload = token.split('.').getOrNull(1) ?: return null
        val json = runCatching {
            String(
                Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            )
        }.getOrNull() ?: return null
        return Regex(""""exp"\s*:\s*(\d+)""")
            .find(json)?.groupValues?.get(1)?.toLongOrNull()
    }

    /**
     * exp 转 ISO-8601（UTC，带毫秒），供网页 `new Date(expire)` 解析。
     * 用 UTC 的 `Z` 后缀而不是本机时区偏移：WebView 与 App 可能不同时区设置也不受影响。
     */
    fun expireIso(token: String?): String? = expSeconds(token)?.let { seconds ->
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date(seconds * 1000))
    }
}
