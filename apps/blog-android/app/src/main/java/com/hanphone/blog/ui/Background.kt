package com.hanphone.blog.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import java.io.File

/**
 * 全局背景层：
 * - 未设置自定义背景 → 使用主题 background 色
 * - 已设置 → 绘制模糊背景图 + 半透明遮罩（保证前景可读性）
 */
@Composable
fun AppBackground(bgPath: String?, blurRadius: Int, modifier: Modifier = Modifier) {
    val file = remember(bgPath) { bgPath?.let { File(it) }?.takeIf { it.exists() } }
    Box(
        modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)
    ) {
        if (file != null) {
            AsyncImage(
                model = file,
                contentDescription = null,
                modifier = Modifier.fillMaxSize().blur(blurRadius.dp),
                contentScale = ContentScale.Crop
            )
            // 遮罩：让前景文字/卡片保持可读
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.22f)))
        }
    }
}