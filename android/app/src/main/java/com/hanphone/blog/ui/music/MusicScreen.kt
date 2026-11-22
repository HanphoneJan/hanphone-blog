package com.hanphone.blog.ui.music

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
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
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.repo.MusicRepository
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.util.currentLyricIndex

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
    var dragPosition by remember { mutableStateOf<Float?>(null) }

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
                dragPosition = dragPosition,
                onDrag = { dragPosition = it },
                onDragFinish = {
                    val target = dragPosition
                    dragPosition = null
                    if (target != null) vm.seekTo(target.toLong())
                },
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
    dragPosition: Float?,
    onDrag: (Float) -> Unit,
    onDragFinish: () -> Unit,
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

        val duration = vm.durationMs.coerceAtLeast(0)
        val position = (dragPosition ?: vm.positionMs.toFloat()).coerceIn(0f, duration.toFloat().coerceAtLeast(1f))
        Slider(
            value = position,
            onValueChange = onDrag,
            onValueChangeFinished = onDragFinish,
            valueRange = 0f..duration.toFloat().coerceAtLeast(1f),
            enabled = duration > 0
        )
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(formatTime(position.toLong()), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            Text(formatTime(duration.toLong()), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        }

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

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}
