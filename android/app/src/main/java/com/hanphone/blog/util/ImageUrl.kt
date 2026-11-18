package com.hanphone.blog.util

import android.net.Uri

/** 文件服务域名（admin-file，与 web 端 PICTURE_BASE_URL 对应） */
const val PICTURE_BASE_URL = "https://hanphone.top"

/**
 * 图片 URL 兼容处理：
 * 先解码 HTML 实体（接口里存在 `&amp;` 形式的 URL，不解码会 400），
 * 绝对地址(https/http)原样返回；相对路径(/xxx)拼上文件服务域名。
 * 帖子封面/正文图片/头像统一走这里 —— 一处解码，全 App 的图都不会再被 `&amp;` 坑。
 */
fun resolveImageUrl(url: String?): String? {
    val decoded = decodeHtmlEntities(url)?.trim()
    if (decoded.isNullOrBlank()) return null
    return if (decoded.startsWith("http://") || decoded.startsWith("https://")) decoded
    else PICTURE_BASE_URL + decoded
}

/**
 * 文库文件服务 URL（与 web docLoader.buildDocFileUrl 一致）：
 * https://hanphone.top/{docNamespace}/{实际文件名}，逐段 URI 编码兼容中文文件名。
 * docNamespace 形如 "blog/docs" 或 "blog/docs/寒枫的作品集"。
 */
fun buildDocFileUrl(docNamespace: String, filename: String): String {
    val ns = docNamespace.ifBlank { "blog/docs" }.trim('/')
    val actual = filename.substringAfterLast('/').trim('/').ifBlank { filename }
    val segments = (ns.split('/') + actual).filter { it.isNotBlank() }
    return "$PICTURE_BASE_URL/${segments.joinToString("/") { Uri.encode(it) }}"
}