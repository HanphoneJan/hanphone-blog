package com.hanphone.blog.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.util.formatDate
import com.hanphone.blog.util.resolveImageUrl

/**
 * 文章卡片：封面 + 标题 + 简介 + 分类徽章 + 点赞/日期。
 * 首页信息流 / 搜索 / 分类通用。
 */
@Composable
fun ArticleCard(
    blog: Blog,
    onClick: () -> Unit,
    showPicture: Boolean = true,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            val cover = remember(blog.firstPicture, blog.type?.picUrl) {
            (blog.firstPicture ?: blog.type?.picUrl)?.let { resolveImageUrl(it) }
        }
            if (showPicture && cover != null) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(cover)
                        .crossfade(180)
                        .build(),
                    contentDescription = blog.title,
                    modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
                    contentScale = ContentScale.Crop
                )
            }
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    blog.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (!blog.description.isNullOrBlank()) {
                    Text(
                        blog.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    blog.type?.let { type ->
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                        ) {
                            Text(
                                type.name,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Icon(
                        Icons.Filled.Favorite,
                        contentDescription = "点赞",
                        modifier = Modifier.size(13.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Text("${blog.likes}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatDate(blog.createTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}