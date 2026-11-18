package com.hanphone.blog.util

import com.hanphone.blog.data.model.FriendLink

/** 博客站域名（默认头像、站内相对路径都挂在博客站，而不是文件服务） */
const val BLOG_SITE_URL = "https://hanphone.cn"

/**
 * 解码 HTML 实体。
 *
 * 后端把部分字段当 HTML 存了一次（例如 q1.qlogo.cn 头像 URL 里的 `&` 落库变成 `&amp;`），
 * 前端如果直接拿去发请求会 400（`https://q1.qlogo.cn/g?b=qq&amp;nk=...` → 400 Bad Request），
 * 于是头像空白、链接打不开。所有「从接口拿到的文本/URL」在展示或请求前都要过这里。
 *
 * 做 3 轮是因为历史数据里出现过 `&amp;amp;` 这种双重转义。
 */
fun decodeHtmlEntities(raw: String?): String? {
    val start: String = raw ?: return null
    if (start.isEmpty()) return start
    var s = start
    repeat(3) {
        val decoded = s
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&#x27;", "'")
            .replace("&apos;", "'")
            .replace("&nbsp;", "\u00A0")
            .replace("&amp;", "&")
        if (decoded == s) return decoded
        s = decoded
    }
    return s
}

/**
 * 头像归一化：解码实体 → 相对路径挂到博客站 → 默认头像视为「没有头像」。
 *
 * 返回 null 时交给 [com.hanphone.blog.ui.components.Avatar] 的首字占位，
 * 比加载一个 404 的 `/default-avatar.png` 干净。
 */
fun normalizeAvatarUrl(url: String?): String? {
    val decoded = decodeHtmlEntities(url)?.trim()
    if (decoded.isNullOrBlank()) return null
    val absolute = if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        decoded
    } else {
        BLOG_SITE_URL + decoded
    }
    return if (absolute == "$BLOG_SITE_URL/default-avatar.png") null else absolute
}

/**
 * 友链字段解码：头像/网址/名称/描述里的 HTML 实体全部解开。
 *
 * 公开友链页与后台友链管理必须走同一套解码 —— 之前后台漏了这一步，
 * 结果就是「公开页能显示的头像，管理中心显示不出来」。
 *
 * 注意：这里只解码、不把默认头像抹成 null，用于把数据写回后端时保持原样。
 */
fun FriendLink.decoded(): FriendLink = copy(
    name = decodeHtmlEntities(name).orEmpty(),
    description = decodeHtmlEntities(description).orEmpty(),
    url = decodeHtmlEntities(url).orEmpty(),
    linkUrl = decodeHtmlEntities(linkUrl),
    avatar = decodeHtmlEntities(avatar),
    siteshot = decodeHtmlEntities(siteshot),
    rss = decodeHtmlEntities(rss),
    nickname = decodeHtmlEntities(nickname),
)

/**
 * 展示用归一化：解码实体 + 头像绝对化（默认头像交给首字占位）。
 * 列表数据一律过这个。
 */
fun FriendLink.normalized(): FriendLink = decoded().copy(avatar = normalizeAvatarUrl(avatar))

/** 列表版归一化 */
fun List<FriendLink>.normalized(): List<FriendLink> = map { it.normalized() }
