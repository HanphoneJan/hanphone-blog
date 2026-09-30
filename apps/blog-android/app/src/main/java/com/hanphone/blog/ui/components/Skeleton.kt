package com.hanphone.blog.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * 骨架屏：用与真实内容同构的占位块 + 扫光动画替代全屏转圈，
 * 页面布局在加载前后保持稳定，感知等待时间更短。
 *
 * 动画值在绘制阶段读取（drawWithCache 内），不触发重组。
 */

/** 基础骨架块：半透明底色 + 从左到右的高光扫过 */
@Composable
fun SkeletonBox(modifier: Modifier = Modifier, shape: Shape = RoundedCornerShape(6.dp)) {
    val progress = rememberShimmerProgress()
    val base = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f)
    val sheen = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.20f)
    Box(
        modifier
            .clip(shape)
            .background(base)
            .drawWithCache {
                onDrawWithContent {
                    drawContent()
                    val w = size.width
                    val x = progress.value * w * 2f - w
                    drawRect(
                        Brush.linearGradient(
                            0f to Color.Transparent,
                            0.5f to sheen,
                            1f to Color.Transparent,
                            start = Offset(x, 0f),
                            end = Offset(x + w, size.height)
                        )
                    )
                }
            }
    )
}

@Composable
private fun rememberShimmerProgress(): State<Float> {
    val transition = rememberInfiniteTransition(label = "skeleton")
    return transition.animateFloat(
        initialValue = -1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing)),
        label = "skeletonProgress"
    )
}

/** 首页文章卡片骨架（对应 ArticleCard：封面 16:9 + 标题两行 + 简介 + 徽章行） */
@Composable
fun ArticleCardSkeleton(showPicture: Boolean = true, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            if (showPicture) {
                SkeletonBox(Modifier.fillMaxWidth().aspectRatio(16f / 9f), RoundedCornerShape(0.dp))
            }
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SkeletonBox(Modifier.fillMaxWidth(0.85f).height(17.dp), RoundedCornerShape(4.dp))
                SkeletonBox(Modifier.fillMaxWidth(0.55f).height(17.dp), RoundedCornerShape(4.dp))
                SkeletonBox(Modifier.fillMaxWidth(0.92f).height(12.dp), RoundedCornerShape(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SkeletonBox(Modifier.size(52.dp, 18.dp), RoundedCornerShape(50))
                    Spacer(Modifier.weight(1f))
                    SkeletonBox(Modifier.size(76.dp, 11.dp), RoundedCornerShape(4.dp))
                }
            }
        }
    }
}

/** 文章列表骨架（首页信息流） */
@Composable
fun ArticleListSkeleton(modifier: Modifier = Modifier, count: Int = 3) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(count) { ArticleCardSkeleton(showPicture = it % 2 == 0) }
    }
}

/** 行列表骨架：头像(可省) + 两行文字。留言板 / 友链 / 搜索结果 / 归档通用 */
@Composable
fun RowListSkeleton(
    modifier: Modifier = Modifier,
    count: Int = 6,
    leading: Dp? = 44.dp,
    contentPadding: Dp = 16.dp
) {
    Column(modifier.fillMaxWidth().padding(horizontal = contentPadding)) {
        repeat(count) {
            Row(
                Modifier.fillMaxWidth().padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (leading != null) SkeletonBox(Modifier.size(leading), CircleShape)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SkeletonBox(Modifier.fillMaxWidth(0.45f).height(14.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.78f).height(12.dp), RoundedCornerShape(4.dp))
                }
            }
        }
    }
}

/** 随笔动态骨架（对应 MomentsRow：头像 + 昵称 + 多行正文 + 九宫格 + 时间） */
@Composable
fun MomentsSkeleton(modifier: Modifier = Modifier, count: Int = 3) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        repeat(count) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SkeletonBox(Modifier.size(36.dp), CircleShape)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SkeletonBox(Modifier.size(92.dp, 14.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth().height(13.dp), RoundedCornerShape(4.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.7f).height(13.dp), RoundedCornerShape(4.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        repeat(3) { SkeletonBox(Modifier.weight(1f).aspectRatio(1f), RoundedCornerShape(6.dp)) }
                    }
                    SkeletonBox(Modifier.size(150.dp, 11.dp), RoundedCornerShape(4.dp))
                }
            }
        }
    }
}

/** 详情页骨架（对应文章/随笔详情：头部信息 + 标题 + 正文段落） */
@Composable
fun DetailSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonBox(Modifier.size(42.dp), CircleShape)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                SkeletonBox(Modifier.size(96.dp, 13.dp), RoundedCornerShape(4.dp))
                SkeletonBox(Modifier.size(64.dp, 10.dp), RoundedCornerShape(4.dp))
            }
        }
        Spacer(Modifier.height(4.dp))
        SkeletonBox(Modifier.fillMaxWidth(0.9f).height(21.dp), RoundedCornerShape(4.dp))
        SkeletonBox(Modifier.fillMaxWidth(0.62f).height(21.dp), RoundedCornerShape(4.dp))
        Spacer(Modifier.height(8.dp))
        repeat(5) { i ->
            SkeletonBox(
                Modifier.fillMaxWidth(if (i == 4) 0.58f else 1f).height(13.dp),
                RoundedCornerShape(4.dp)
            )
        }
        Spacer(Modifier.height(8.dp))
        repeat(3) { i ->
            SkeletonBox(
                Modifier.fillMaxWidth(if (i == 2) 0.72f else 1f).height(13.dp),
                RoundedCornerShape(4.dp)
            )
        }
    }
}
