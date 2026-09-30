package com.hanphone.blog.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.hanphone.blog.util.resolveImageUrl

/** 居中加载 */
@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

/** 错误 + 重试 */
@Composable
fun ErrorBox(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Filled.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(36.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 12.dp)
        )
        Button(onClick = onRetry, modifier = Modifier.padding(top = 16.dp)) { Text("重试") }
    }
}

/** 空数据 */
@Composable
fun EmptyBox(message: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
    }
}

/** 头像：有 URL 显图，否则显示首字符。shape 默认圆形，朋友圈可传圆角方形 */
@Composable
fun Avatar(
    url: String?,
    name: String,
    size: Dp = 36.dp,
    modifier: Modifier = Modifier,
    shape: Shape = CircleShape
) {
    val resolved = remember(url) { url?.let { resolveImageUrl(it) } }
    if (resolved != null) {
        AsyncImage(
            model = resolved,
            contentDescription = name,
            modifier = modifier.size(size).clip(shape),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier.then(Modifier.size(size).clip(shape).background(MaterialTheme.colorScheme.primaryContainer)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                name.firstOrNull()?.toString() ?: "匿",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

/** 区块标题 */
@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
    )
}

/** 列表底部加载状态 */
@Composable
fun ListFooter(
    loadingMore: Boolean,
    hasMore: Boolean,
    showText: Boolean,
    mod: Modifier = Modifier
) {
    Box(
        Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp).then(mod),
        contentAlignment = Alignment.Center
    ) {
        when {
            loadingMore -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            showText && !hasMore -> Text(
                "— 已到底啦 —",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}

/** 详情页底部操作项（点赞/评论/分享等）。weight 由父级 Row 传入。 */
@Composable
fun BottomActionItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    modifier: Modifier = Modifier
) {
    Column(
        modifier.padding(vertical = 6.dp).then(modifier),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        IconButton(onClick = onClick, modifier = Modifier.size(30.dp)) {
            Icon(icon, contentDescription = label, modifier = Modifier.size(20.dp), tint = tint)
        }
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}