package com.hanphone.blog.util

import java.net.URI

/**
 * 站内深链目标（App Links：https://hanphone.cn/...，见 AndroidManifest 的 MainActivity）。
 */
sealed interface DeepLinkTarget {
    data class Article(val id: Long) : DeepLinkTarget
    data class Essay(val id: Long) : DeepLinkTarget

    /** 文档深链本轮只到「文库列表」，不直接打开某个文件 */
    data object Docs : DeepLinkTarget

    /** 随笔列表（无具体 id 的 /essays 链接） */
    data object Essays : DeepLinkTarget
}

/**
 * 深链解析：**纯函数**，用 `java.net.URI` 而不是 `android.net.Uri`，
 * 这样 JVM 单元测试里可以直接跑（android.net.Uri 在本地单测中全是 stub）。
 *
 * 只接受 `https` + `hanphone.cn`：
 * - `https://hanphone.cn/blog/123/` → [DeepLinkTarget.Article]
 * - `https://hanphone.cn/essays/#123`（也兼容 `/essays/123`）→ [DeepLinkTarget.Essay]
 * - `https://hanphone.cn/essays/`（无 id）→ [DeepLinkTarget.Essays]
 * - `https://hanphone.cn/docs/...` → [DeepLinkTarget.Docs]
 *
 * query 串一律忽略；http、其他域名、非法 URL、OAuth 回跳地址都返回 null。
 */
object DeepLink {

    private const val HOST = "hanphone.cn"

    fun parse(raw: String?): DeepLinkTarget? {
        if (raw.isNullOrBlank()) return null
        val uri = runCatching { URI(raw.trim()) }.getOrNull() ?: return null

        if (!"https".equals(uri.scheme, ignoreCase = true)) return null
        if (uri.host?.equals(HOST, ignoreCase = true) != true) return null

        // URI 已把 query 拆走，这里只看 path（query 存在时天然被忽略）
        val segments = uri.path.orEmpty().split('/').filter { it.isNotEmpty() }
        if (segments.isEmpty()) return null

        return when (segments.first()) {
            "blog" -> segments.getOrNull(1)?.toLongOrNull()?.let { DeepLinkTarget.Article(it) }
            "essays" -> parseEssay(segments, uri.fragment)
            "docs" -> DeepLinkTarget.Docs
            else -> null
        }
    }

    /**
     * 随笔：站内通知的链接是 `/essays/#123`（fragment），网页版分享链接是 `/essays/123`。
     * 两种都认；都取不到 id 时回到随笔 Tab。
     */
    private fun parseEssay(segments: List<String>, fragment: String?): DeepLinkTarget {
        val pathId = segments.getOrNull(1)?.toLongOrNull()
        val fragmentId = fragment?.trim()?.toLongOrNull()
        val id = pathId ?: fragmentId
        return if (id != null) DeepLinkTarget.Essay(id) else DeepLinkTarget.Essays
    }
}
