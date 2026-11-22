package com.hanphone.blog.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.ui.components.SectionTitle
import com.hanphone.blog.util.formatDate
import com.hanphone.blog.util.resolveImageUrl

/**
 * 首页 = 站点入口页。
 *
 * 结构：功能宫格（热点/项目/文库/音乐库/照片墙/留言板）→ 最近随笔横向预览 → 最新文章列表。
 *
 * 这些内容型入口原先堆在「我的」页，导致账号页变成功能总目录——现已迁到首页，
 * **不要在「我的」再放一份**（两处都有等于两处都找不到）。
 */

/** 宫格里的六个内容/工具入口（「我的」只留账号相关的通知/收藏/友链/设置） */
enum class HomeEntry(val label: String, val icon: ImageVector) {
    HOT("热点", Icons.Filled.LocalFireDepartment),
    PROJECTS("项目", Icons.Filled.Build),
    DOCS("文库", Icons.AutoMirrored.Filled.List),
    MUSIC("音乐库", Icons.Filled.LibraryMusic),
    PHOTO("照片墙", Icons.Filled.PhotoLibrary),
    MESSAGE("留言板", Icons.Filled.Email)
}

/** 功能宫格：3 列 2 行（图标 + 4 字以内标签），点击进入对应页面 */
@Composable
fun HomeEntryGrid(onOpen: (HomeEntry) -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(vertical = 8.dp)) {
            HomeEntry.entries.chunked(3).forEach { row ->
                Row(Modifier.fillMaxWidth()) {
                    row.forEach { entry ->
                        Column(
                            Modifier
                                .weight(1f)
                                .clickable(onClickLabel = entry.label) { onOpen(entry) }
                                .padding(vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    entry.icon,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Text(entry.label, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    // 末行不足 3 个时补位，保证图标列对齐
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

/** 最近随笔：标题行（全部 >）+ 横向 4 张预览卡 */
@Composable
fun RecentEssaysSection(
    essays: List<Essay>,
    onOpenEssay: (Long) -> Unit,
    onOpenAll: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            SectionTitle("最近随笔")
            Spacer(Modifier.weight(1f))
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .clickable(onClickLabel = "查看全部随笔") { onOpenAll() }
                    .padding(start = 8.dp, end = 4.dp, top = 2.dp, bottom = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "全部",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(essays, key = { it.id }) { essay ->
                EssayPreviewCard(essay = essay, onClick = { onOpenEssay(essay.id) })
            }
        }
    }
}

/** 随笔预览卡（固定 220×208，保证横滑时等高）；有图先显示一张缩略图 */
@Composable
private fun EssayPreviewCard(essay: Essay, onClick: () -> Unit) {
    val context = LocalContext.current
    val image = remember(essay) {
        (essay.essayFileUrls.firstOrNull { !it.urlType.equals("video", ignoreCase = true) }?.displayUrl()
            ?: essay.image)?.let { resolveImageUrl(it) }
    }
    Card(
        onClick = onClick,
        modifier = Modifier.width(220.dp).height(208.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            if (image != null) {
                AsyncImage(
                    model = ImageRequest.Builder(context).data(image).crossfade(180).build(),
                    imageLoader = ImageCaches.loader(ImageCaches.Feature.ESSAY),
                    contentDescription = null,
                    modifier = Modifier.fillMaxWidth().height(92.dp),
                    contentScale = ContentScale.Crop
                )
            }
            Column(
                Modifier.weight(1f).padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    essay.content.trim().ifBlank { essay.title.ifBlank { "分享了一组图片" } },
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        formatDate(essay.createTime),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.weight(1f))
                    Icon(
                        Icons.Filled.Favorite,
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        " ${essay.likes}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
