package com.hanphone.blog.util

import androidx.compose.ui.graphics.Color

/**
 * 解析后端传来的十六进制颜色（如 "#2C7BE5" / "2C7BE5"）。
 * 分类/标签/友链等站点已有配色资源，解析失败返回 null（由调用方回退默认色）。
 */
fun String.parseHexColor(): Color? {
    val s = trim().removePrefix("#")
    if (s.length != 6) return null
    val v = s.toLongOrNull(16) ?: return null
    return Color(0xFF000000L or v)
}