package com.hanphone.blog.ui.music

import androidx.compose.foundation.clickable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.QueueMusic
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.RepeatOne
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.repo.MusicRepository
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.util.currentLyricIndex
import kotlin.math.roundToInt

/**
 * 音乐库（原生播放器，替代原先的网页 WebView）。
 *
 * 页面结构：封面 → 歌名/歌手 → 歌词（随播放高亮并自动滚动）→ 进度条 → 播放控制 → 歌单弹层。
 * 音频播放由 [MusicViewModel] 用系统 MediaPlayer 完成，离开页面即释放。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MusicScreen(onBack: () -> Unit, vm: MusicViewModel = hiltViewModel()) {
    var showPlaylist by remember { mutableStateOf(false) }

    val lyricState = rememberLazyListState()
    val currentLine = remember(vm.lyrics, vm.positionMs) {
        currentLyricIndex(vm.lyrics, vm.positionMs.toLong())
    }
    LaunchedEffect(currentLine) {
        if (currentLine >= 0 && vm.lyrics.isNotEmpty()) {
            runCatching { lyricState.animateScrollToItem((currentLine - 2).coerceAtLeast(0)) }
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(
            title = "音乐库",
            onBack = onBack,
            actions = {
                IconButton(onClick = { showPlaylist = true }) {
                    Icon(Icons.Filled.QueueMusic, contentDescription = "播放列表")
                }
            }
        )

        when {
            vm.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }

            vm.error != null && vm.tracks.isEmpty() -> ErrorBox(
                vm.error.orEmpty(),
                onRetry = { vm.loadPlaylist() }
            )

            else -> MusicContent(
                vm = vm,
                lyricState = lyricState,
                currentLine = currentLine,
                onShowPlaylist = { showPlaylist = true }
            )
        }
    }

    if (showPlaylist) {
        ModalBottomSheet(onDismissRequest = { showPlaylist = false }) {
            Text(
                "播放列表（${vm.tracks.size}）",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
            )
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 420.dp)) {
                itemsIndexed(vm.tracks, key = { _, t -> t.id }) { index, track ->
                    val selected = index == vm.currentIndex
                    Row(
                        Modifier.fillMaxWidth()
                            .clickable {
                                vm.select(index)
                                showPlaylist = false
                            }
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                track.title.ifBlank { "未知歌曲" },
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                track.author,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (selected) {
                            Text(
                                "播放中",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    androidx.compose.material3.HorizontalDivider(
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                    )
                }
            }
        }
    }
}

@Composable
private fun MusicContent(
    vm: MusicViewModel,
    lyricState: androidx.compose.foundation.lazy.LazyListState,
    currentLine: Int,
    onShowPlaylist: () -> Unit
) {
    val track = vm.current
    val cover = remember(track?.id) { track?.let { MusicRepository().coverUrl(it) } }

    Column(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            Modifier.padding(top = 12.dp).size(220.dp),
            contentAlignment = Alignment.Center
        ) {
            if (cover != null) {
                AsyncImage(
                    model = cover,
                    imageLoader = ImageCaches.loader(ImageCaches.Feature.MUSIC),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp))
                )
            }
            if (vm.preparing) {
                CircularProgressIndicator(Modifier.size(40.dp), strokeWidth = 3.dp)
            }
        }

        Text(
            track?.title?.ifBlank { "未知歌曲" } ?: "暂无歌曲",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 16.dp)
        )
        Text(
            track?.author.orEmpty(),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp)
        )

        // 歌词：占剩余空间，当前行高亮 + 自动滚动
        Box(Modifier.weight(1f).fillMaxWidth().padding(vertical = 8.dp)) {
            if (vm.lyrics.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        if (vm.preparing) "歌词加载中…" else "暂无歌词",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            } else {
                LazyColumn(
                    state = lyricState,
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(vm.lyrics) { line ->
                        val active = vm.lyrics.getOrNull(currentLine) === line
                        Text(
                            line.text,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }

        if (!vm.error.isNullOrBlank()) {
            Text(
                vm.error.orEmpty(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }

        MusicProgressSlider(
            positionMs = vm.positionMs,
            durationMs = vm.durationMs,
            bufferPercent = vm.bufferPercent,
            onSeek = vm::seekTo
        )

        Row(
            Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            IconButton(onClick = { vm.cycleMode() }) {
                Icon(
                    when (vm.mode) {
                        PlayMode.LIST -> Icons.Filled.Repeat
                        PlayMode.SINGLE -> Icons.Filled.RepeatOne
                        PlayMode.SHUFFLE -> Icons.Filled.Shuffle
                    },
                    contentDescription = vm.mode.label
                )
            }
            IconButton(onClick = { vm.prev() }, modifier = Modifier.size(48.dp)) {
                Icon(Icons.Filled.SkipPrevious, contentDescription = "上一首", modifier = Modifier.size(32.dp))
            }
            FilledIconButton(
                onClick = { vm.toggle() },
                modifier = Modifier.size(64.dp),
                enabled = vm.tracks.isNotEmpty()
            ) {
                if (vm.preparing) {
                    CircularProgressIndicator(
                        Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(
                        if (vm.playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (vm.playing) "暂停" else "播放",
                        modifier = Modifier.size(36.dp)
                    )
                }
            }
            IconButton(onClick = { vm.next() }, modifier = Modifier.size(48.dp)) {
                Icon(Icons.Filled.SkipNext, contentDescription = "下一首", modifier = Modifier.size(32.dp))
            }
            IconButton(onClick = onShowPlaylist) {
                Icon(Icons.Filled.QueueMusic, contentDescription = "播放列表")
            }
        }
    }
}

/**
 * 播放进度条（方案 A）：轻量胶囊 + 拖动气泡 + 缓冲段。
 *
 * - 轨道常态 3dp、拖动时 5dp；已播放主色、已缓冲主色 22%；
 * - thumb 常态 12dp 圆点（2dp 背景色描边），拖动放大到 16dp；
 * - 按下即进入拖动并浮出目标时间气泡，松手才真正 seek；
 * - 自己处理手势（按下/拖动/抬起），不依赖 M3 Slider 的默认竖条 thumb。
 */
@Composable
private fun MusicProgressSlider(
    positionMs: Int,
    durationMs: Int,
    bufferPercent: Int,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val enabled = durationMs > 0
    val haptic = LocalHapticFeedback.current

    var dragging by remember { mutableStateOf(false) }
    var dragFraction by remember { mutableFloatStateOf(0f) }
    var bubbleWidthPx by remember { mutableIntStateOf(0) }

    val progressFraction = if (enabled) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f
    val shownFraction = if (dragging) dragFraction else progressFraction
    val shownMs = if (dragging) (dragFraction * durationMs).toLong() else positionMs.toLong()

    val primary = MaterialTheme.colorScheme.primary
    val trackColor = MaterialTheme.colorScheme.surfaceVariant
    val ringColor = MaterialTheme.colorScheme.background
    val bubbleColor = MaterialTheme.colorScheme.onSurface
    val bubbleText = MaterialTheme.colorScheme.surface
    val timeStyle = MaterialTheme.typography.labelSmall.copy(fontFeatureSettings = "tnum")

    BoxWithConstraints(modifier.fillMaxWidth()) {
        val widthPx = constraints.maxWidth.toFloat()
        Column(Modifier.fillMaxWidth()) {
            // 拖动气泡（占一行，避免盖住封面/标题；靠近边缘时夹紧不出屏）
            Box(Modifier.fillMaxWidth().height(26.dp)) {
                if (dragging && enabled) {
                    Box(
                        Modifier.offset {
                            val offsetX = (shownFraction * widthPx - bubbleWidthPx / 2f)
                                .coerceIn(0f, (widthPx - bubbleWidthPx).coerceAtLeast(0f))
                            IntOffset(offsetX.roundToInt(), 0)
                        }
                    ) {
                        Surface(
                            color = bubbleColor,
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.onSizeChanged { bubbleWidthPx = it.width }
                        ) {
                            Text(
                                formatTime(shownMs),
                                style = timeStyle,
                                color = bubbleText,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            Box(
                Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .pointerInput(durationMs) {
                        if (durationMs <= 0) return@pointerInput
                        awaitEachGesture {
                            val down = awaitFirstDown(requireUnconsumed = false)
                            if (size.width <= 0) return@awaitEachGesture
                            dragging = true
                            dragFraction = (down.position.x / size.width).coerceIn(0f, 1f)
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            while (true) {
                                val event = awaitPointerEvent()
                                event.changes.forEach { change ->
                                    if (change.pressed) {
                                        dragFraction = (change.position.x / size.width).coerceIn(0f, 1f)
                                    }
                                    change.consume()
                                }
                                if (event.changes.none { it.pressed }) break
                            }
                            onSeek((dragFraction * durationMs).toLong())
                            dragging = false
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        }
                    }
            ) {
                Canvas(Modifier.fillMaxSize()) {
                    val centerY = size.height / 2f
                    val trackHeight = if (dragging) 5.dp.toPx() else 3.dp.toPx()
                    val radius = trackHeight / 2f

                    // 未播放
                    drawRoundRect(
                        color = trackColor,
                        topLeft = Offset(0f, centerY - radius),
                        size = Size(size.width, trackHeight),
                        cornerRadius = CornerRadius(radius, radius)
                    )
                    // 已缓冲
                    val buffered = (bufferPercent / 100f).coerceIn(0f, 1f)
                    if (buffered > 0f) {
                        drawRoundRect(
                            color = primary.copy(alpha = 0.22f),
                            topLeft = Offset(0f, centerY - radius),
                            size = Size(size.width * buffered, trackHeight),
                            cornerRadius = CornerRadius(radius, radius)
                        )
                    }
                    // 已播放
                    if (shownFraction > 0f) {
                        drawRoundRect(
                            color = primary,
                            topLeft = Offset(0f, centerY - radius),
                            size = Size(size.width * shownFraction, trackHeight),
                            cornerRadius = CornerRadius(radius, radius)
                        )
                    }
                    // thumb：背景色描边 + 主色圆点
                    val thumbRadius = if (dragging) 8.dp.toPx() else 6.dp.toPx()
                    val cx = (size.width * shownFraction).coerceIn(thumbRadius, size.width - thumbRadius)
                    drawCircle(ringColor, radius = thumbRadius + 2.dp.toPx(), center = Offset(cx, centerY))
                    drawCircle(primary, radius = thumbRadius, center = Offset(cx, centerY))
                }
            }

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(formatTime(shownMs), style = timeStyle, color = MaterialTheme.colorScheme.outline)
                Text(formatTime(durationMs.toLong()), style = timeStyle, color = MaterialTheme.colorScheme.outline)
            }
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}
