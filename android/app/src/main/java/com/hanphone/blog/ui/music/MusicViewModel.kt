package com.hanphone.blog.ui.music

import android.content.ComponentName
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.hanphone.blog.data.model.LyricLine
import com.hanphone.blog.data.model.MusicTrack
import com.hanphone.blog.data.repo.MusicRepository
import com.hanphone.blog.playback.MusicPlaybackService
import com.hanphone.blog.playback.MusicQueue
import com.hanphone.blog.playback.PlayMode
import com.hanphone.blog.util.parseLrc
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 音乐库（页面侧控制器）。
 *
 * 播放本身在 [MusicPlaybackService]（前台服务 + MediaSession）里：离开页面、锁屏、
 * 划掉任务都继续播，通知栏/锁屏/耳机按键都能控制。这里只负责
 * - 连接 MediaController，把播放器状态映射成 Compose 状态（进度、缓冲、倍速、模式…）；
 * - 首次进入时拉歌单并塞进播放器队列；重进时**只回填状态**，不打断正在播的歌；
 * - 歌词按当前曲目拉取并缓存。
 */
@HiltViewModel
class MusicViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repo: MusicRepository
) : ViewModel() {

    var tracks by mutableStateOf<List<MusicTrack>>(emptyList())
        private set
    var currentIndex by mutableIntStateOf(-1)
        private set
    var playing by mutableStateOf(false)
        private set
    var preparing by mutableStateOf(false)
        private set
    var loading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var positionMs by mutableIntStateOf(0)
        private set
    var durationMs by mutableIntStateOf(0)
        private set
    /** 缓冲百分比（0..100）：进度条上的浅色缓冲段 */
    var bufferPercent by mutableIntStateOf(0)
        private set
    var lyrics by mutableStateOf<List<LyricLine>>(emptyList())
        private set
    var mode by mutableStateOf(PlayMode.LIST)
        private set
    /** 播放速度（0.5x ~ 2.0x），切歌后保持 */
    var speed by mutableFloatStateOf(1.0f)
        private set

    val current: MusicTrack? get() = tracks.getOrNull(currentIndex)

    private val controllerFuture: ListenableFuture<MediaController>
    private var controller: MediaController? = null

    private var ticker: Job? = null
    private var lyricsJob: Job? = null
    private var loadingPlaylist = false
    private var lyricsTrackId: String? = null
    private val lyricsCache = mutableMapOf<String, List<LyricLine>>()

    private val playerListener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = syncFromPlayer()
    }

    init {
        val token = SessionToken(context, ComponentName(context, MusicPlaybackService::class.java))
        controllerFuture = MediaController.Builder(context, token).buildAsync()
        controllerFuture.addListener(
            {
                val c = runCatching { controllerFuture.get() }.getOrNull()
                if (c == null) {
                    error = "播放器启动失败，请重启 App 再试"
                    loading = false
                    return@addListener
                }
                controller = c
                c.addListener(playerListener)
                syncFromPlayer()
                loadPlaylist()
            },
            ContextCompat.getMainExecutor(context)
        )
    }

    /** 拉歌单：首次进入建队列（不自动播）；已在播则只刷新页面状态 */
    fun loadPlaylist() {
        if (loadingPlaylist) return
        val c = controller
        if (c == null) {
            error = "播放器启动失败，请重启 App 再试"
            loading = false
            return
        }
        loadingPlaylist = true
        viewModelScope.launch {
            loading = true
            error = null
            val res = runCatching { repo.playlist() }.getOrNull()
            loadingPlaylist = false
            if (res.isNullOrEmpty()) {
                error = "歌单加载失败，请稍后重试"
                loading = false
                return@launch
            }
            tracks = res
            loading = false
            if (c.mediaItemCount == 0) {
                c.setMediaItems(MusicQueue.items(res) { repo.coverUrl(it) })
                c.repeatMode = MusicQueue.repeatModeOf(mode)
                c.shuffleModeEnabled = MusicQueue.shuffleOf(mode)
                c.setPlaybackSpeed(speed)
                // 选中第一首并预加载（不自动播放，避免一进页面就出声）
                select(0, autoPlay = false)
            } else {
                syncFromPlayer()
            }
        }
    }

    fun select(index: Int, autoPlay: Boolean = true) {
        val c = controller ?: return
        if (tracks.isEmpty() || c.mediaItemCount == 0) return
        val safe = index.coerceIn(0, minOf(tracks.lastIndex, c.mediaItemCount - 1))
        error = null
        positionMs = 0
        durationMs = 0
        bufferPercent = 0
        c.seekTo(safe, 0)
        c.prepare()
        if (autoPlay) c.play() else c.pause()
    }

    fun toggle() {
        val c = controller ?: return
        if (c.mediaItemCount == 0) {
            loadPlaylist()
            return
        }
        if (c.isPlaying) {
            c.pause()
        } else {
            error = null
            c.prepare()
            c.play()
        }
    }

    fun next() {
        val c = controller ?: return
        if (c.mediaItemCount == 0) return
        error = null
        // 单曲循环时「下一首」按列表导航（repeat ONE 会被当成 OFF），末尾回到第一首
        if (c.hasNextMediaItem()) c.seekToNextMediaItem() else c.seekTo(0, 0)
        c.prepare()
        c.play()
    }

    fun prev() {
        val c = controller ?: return
        if (c.mediaItemCount == 0) return
        error = null
        // seekToPrevious：当前播放超过 3 秒先回本曲开头；单曲循环在第一首时回到最后一首
        if (c.currentPosition <= PREV_RESTART_MS && !c.hasPreviousMediaItem()) {
            c.seekTo(c.mediaItemCount - 1, 0)
        } else {
            c.seekToPrevious()
        }
        c.prepare()
        c.play()
    }

    fun seekTo(ms: Long) {
        val c = controller ?: return
        val max = if (durationMs > 0) durationMs.toLong() else ms.coerceAtLeast(0)
        val target = ms.coerceIn(0L, max)
        c.seekTo(target)
        positionMs = target.toInt()
    }

    fun chooseSpeed(value: Float) {
        val v = value.coerceIn(0.5f, 2.0f)
        speed = v
        runCatching { controller?.setPlaybackSpeed(v) }
    }

    fun cycleMode() {
        mode = mode.next()
        val c = controller ?: return
        c.repeatMode = MusicQueue.repeatModeOf(mode)
        c.shuffleModeEnabled = MusicQueue.shuffleOf(mode)
    }

    // ------------------------------------------------------------------

    /** 播放器状态 → 页面状态（Main 线程回调） */
    private fun syncFromPlayer() {
        val c = controller ?: return
        playing = c.isPlaying
        preparing = c.playbackState == Player.STATE_BUFFERING
        currentIndex = if (c.mediaItemCount > 0) c.currentMediaItemIndex else -1
        durationMs = c.duration.takeIf { it != C.TIME_UNSET && it > 0 }?.toInt() ?: 0
        bufferPercent = c.bufferedPercentage.coerceIn(0, 100)
        speed = c.playbackParameters.speed
        mode = MusicQueue.playModeOf(c.repeatMode, c.shuffleModeEnabled)
        if (c.playerError != null) error = "音频播放失败，请换一首"
        ensureLyrics(c.currentMediaItem?.mediaId)

        if (playing) {
            startTicker()
        } else {
            ticker?.cancel()
            ticker = null
            positionMs = c.currentPosition.coerceAtLeast(0).toInt()
        }
    }

    private fun ensureLyrics(trackId: String?) {
        if (trackId.isNullOrBlank() || trackId == lyricsTrackId) return
        lyricsTrackId = trackId
        lyrics = lyricsCache[trackId].orEmpty()
        // 连点切歌时只给「停下来」的那首拉歌词，避免每切一首就一个 BFF 请求
        lyricsJob?.cancel()
        lyricsJob = viewModelScope.launch {
            delay(LYRICS_DEBOUNCE_MS)
            val lrc = runCatching { repo.lyric(trackId) }.getOrNull()
            val parsed = parseLrc(lrc?.lyric, lrc?.tlyric)
            lyricsCache[trackId] = parsed
            if (lyricsTrackId == trackId) lyrics = parsed
        }
    }

    private fun startTicker() {
        if (ticker?.isActive == true) return
        ticker = viewModelScope.launch {
            while (isActive) {
                positionMs = controller?.currentPosition?.coerceAtLeast(0)?.toInt() ?: positionMs
                delay(500)
            }
        }
    }

    override fun onCleared() {
        ticker?.cancel()
        ticker = null
        lyricsJob?.cancel()
        lyricsJob = null
        controller?.removeListener(playerListener)
        controller = null
        // 只断开控制通道：播放器归服务所有，离开页面继续播
        MediaController.releaseFuture(controllerFuture)
        super.onCleared()
    }

    private companion object {
        /** 与 Player.seekToPrevious 的默认阈值一致：超过 3 秒按「回本曲开头」处理 */
        const val PREV_RESTART_MS = 3_000L

        /** 切歌静置后才拉歌词（连点时不产生一堆请求） */
        const val LYRICS_DEBOUNCE_MS = 300L
    }
}
