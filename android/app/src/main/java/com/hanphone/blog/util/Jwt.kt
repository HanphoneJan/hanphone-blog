package com.hanphone.blog.util

import android.util.Base64

/**
 * JWT 过期判断（只读 payload 里的 `exp`，不验签）。
 *
 * 为什么要这个：后端只对 admin 路径与聊天接口校验 token，公开接口完全不看。
 * 所以 token 过期后 App 表面上仍是「已登录」（昵称/头像来自 DataStore 缓存），
 * 直到用户点进管理中心或私信才收到 401 —— 表现成「列表空白 / 连接失败」，
 * 很容易被误判成功能坏了。启动时先判断一次，过期就直接退回未登录态。
 */
object Jwt {

    /** 允许的时钟误差（秒） */
    private const val SKEW_SECONDS = 60L

    fun isExpired(token: String?, skewSeconds: Long = SKEW_SECONDS): Boolean {
        if (token.isNullOrBlank()) return false
        val payload = token.split('.').getOrNull(1) ?: return false
        val json = runCatching {
            String(
                Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            )
        }.getOrNull() ?: return false
        val exp = Regex(""""exp"\s*:\s*(\d+)""")
            .find(json)?.groupValues?.get(1)?.toLongOrNull() ?: return false
        return System.currentTimeMillis() / 1000 > exp - skewSeconds
    }
}
