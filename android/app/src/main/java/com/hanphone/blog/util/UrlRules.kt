package com.hanphone.blog.util

import java.net.URI

/**
 * 图片/附件 URL 的校验与类型推断。
 *
 * 后台图片字段统一支持“相册上传”和“手填 URL”，手填地址只接受 http/https：
 * `javascript:` 之类放进图片控件不会执行，但没有理由放行；
 * `data:` 会绕过后端体积限制，后台表单不接受。
 */
object UrlRules {

    fun isHttpUrl(value: String): Boolean {
        val raw = value.trim()
        if (raw.isEmpty()) return false
        return try {
            val uri = URI(raw)
            val scheme = uri.scheme ?: return false
            (scheme.equals("http", ignoreCase = true) || scheme.equals("https", ignoreCase = true)) &&
                !uri.host.isNullOrBlank()
        } catch (_: Exception) {
            false
        }
    }

    fun normalize(value: String): String = value.trim()

    /**
     * 按扩展名推断附件类型，取值与后端 `url_type` 一致（大写）。
     * 外链附件拿不到 MIME，只能靠后缀；识别不了就按 OTHER 处理。
     */
    fun mediaKindOf(url: String): String {
        val path = try {
            URI(url.trim()).path.orEmpty()
        } catch (_: Exception) {
            url.trim()
        }
        val ext = path.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "jpg", "jpeg", "png", "gif", "webp", "bmp", "avif", "heic", "heif", "svg" -> "IMAGE"
            "mp4", "mov", "m4v", "webm", "avi", "mkv" -> "VIDEO"
            "md", "txt" -> "TEXT"
            else -> "OTHER"
        }
    }
}
