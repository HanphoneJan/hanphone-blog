package com.hanphone.blog.ui.music

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.LyricLine
import com.hanphone.blog.data.model.MusicTrack
import com.hanphone.blog.data.repo.MusicRepository
import com.hanphone.blog.util.parseLrc
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random
import javax.inject.Inject

/** 播放模式：列表循环 / 单曲循环 / 随机 */
enum class PlayMode(val label: String) {
    LIST("列表循环"),
    SINGLE("单曲循环"),
    SHUFFLE("随机播放")
}

/**
 * 音乐库（原生播放器）。
 *
 * 数据来自站点的 `/next-api/music`（网易云歌单），音频用系统 MediaPlayer 播放，
 * **离开页面即释放**（与网页版一致，不做后台播放/通知栏控制）。
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
    var lyrics by mutableStateOf<List<LyricLine>>(emptyList())
        private set
    var mode by mutableStateOf(PlayMode.LIST)
        private set

    val current: MusicTrack? get() = tracks.getOrNull(currentIndex)

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    private var player: MediaPlayer? = null
    private var prepared = false
    /** 当前这首「应该播放」——prepare 完成后据此决定是否 start */
    private var playWhenReady = false

    private var loadJob: Job? = null
    private var ticker: Job? = null
    private val urlCache = mutableMapOf<String, String>()

    private companion object {
        const val BROWSER_UA =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/120.0.0.0 Mobile Safari/537.36"
    }

    private val focusRequest by lazy {
        AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setOnAudioFocusChangeListener { change ->
                if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                    pause()
                }
            }
            .build()
    }

    init {
        loadPlaylist()
    }

    fun loadPlaylist() {
        viewModelScope.launch {
            loading = true
            error = null
            val res = runCatching { repo.playlist() }.getOrNull()
            if (res.isNullOrEmpty()) {
                error = "歌单加载失败，请稍后重试"
                loading = false
                return@launch
            }
            tracks = res
            loading = false
            // 选中第一首并预加载（不自动播放，避免一进页面就出声）
            select(0, autoPlay = false)
        }
    }

    fun select(index: Int, autoPlay: Boolean = true) {
        if (tracks.isEmpty()) return
        val safe = index.coerceIn(0, tracks.lastIndex)
        currentIndex = safe
        positionMs = 0
        durationMs = 0
        lyrics = emptyList()
        error = null
        playWhenReady = autoPlay
        loadTrack(tracks[safe])
    }

    fun toggle() {
        val track = current ?: return
        if (prepared) {
            if (playing) pause() else resume()
            return
        }
        // 还没准备好（或上一首失败）：重新加载当前曲目
        playWhenReady = true
        loadTrack(track)
    }

    fun next() {
        if (tracks.isEmpty()) return
        val target = if (mode == PlayMode.SHUFFLE) randomIndex() else (currentIndex + 1) % tracks.size
        select(target)
    }

    fun prev() {
        if (tracks.isEmpty()) return
        val target = if (mode == PlayMode.SHUFFLE) randomIndex() else (currentIndex - 1 + tracks.size) % tracks.size
        select(target)
    }

    fun seekTo(ms: Long) {
        val p = player ?: return
        if (!prepared) return
        val target = ms.coerceIn(0L, durationMs.toLong())
        runCatching { p.seekTo(target.toInt()) }
        positionMs = target.toInt()
    }

    fun cycleMode() {
        mode = when (mode) {
            PlayMode.LIST -> PlayMode.SINGLE
            PlayMode.SINGLE -> PlayMode.SHUFFLE
            PlayMode.SHUFFLE -> PlayMode.LIST
        }
    }

    // ------------------------------------------------------------------

    private fun loadTrack(track: MusicTrack) {
        loadJob?.cancel()
        ticker?.cancel()
        playing = false
        prepared = false
        preparing = true
        stopPlayer()

        loadJob = viewModelScope.launch {
            val url = urlCache[track.id] ?: runCatching { repo.songUrl(track.id) }.getOrNull()
            if (url.isNullOrBlank()) {
                preparing = false
                playWhenReady = false
                error = "《${track.title.ifBlank { "这首歌" }}》暂时无法播放"
                return@launch
            }
            urlCache[track.id] = url
            if (current?.id != track.id) return@launch

            // 歌词单独拉，失败不影响播放
            launch {
                val lrc = runCatching { repo.lyric(track.id) }.getOrNull()
                if (current?.id == track.id) {
                    lyrics = parseLrc(lrc?.lyric, lrc?.tlyric)
                }
            }

            val mp = ensurePlayer()
            val ok = runCatching {
                mp.reset()
                // 网易云 CDN 会拒绝 stagefright 的默认 UA（403），必须伪装成浏览器
                mp.setDataSource(
                    context,
                    Uri.parse(url),
                    mapOf(
                        "User-Agent" to BROWSER_UA,
                        "Referer" to "https://music.163.com/"
                    )
                )
                mp.prepareAsync()
            }.isSuccess
            if (!ok) {
                preparing = false
                playWhenReady = false
                error = "音频加载失败"
            }
        }
    }

    private fun ensurePlayer(): MediaPlayer {
        player?.let { return it }
        return MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            setOnPreparedListener { mp ->
                prepared = true
                preparing = false
                error = null
                durationMs = mp.duration.coerceAtLeast(0)
                if (playWhenReady) {
                    requestFocus()
                    mp.start()
                    playing = true
                    startTicker()
                }
            }
            setOnCompletionListener {
                if (mode == PlayMode.SINGLE) {
                    runCatching { seekTo(0) }
                    it.start()
                    playing = true
                    startTicker()
                } else {
                    next()
                }
            }
            setOnErrorListener { _, _, _ ->
                preparing = false
                playing = false
                playWhenReady = false
                error = "音频播放失败，请换一首"
                true
            }
            player = this
        }
    }

    private fun resume() {
        val p = player ?: return
        requestFocus()
        runCatching { p.start() }
        playing = true
        playWhenReady = true
        startTicker()
    }

    private fun pause() {
        stopTicker()
        runCatching { player?.pause() }
        playing = false
        playWhenReady = false
        abandonFocus()
    }

    private fun stopPlayer() {
        runCatching { player?.reset() }
        abandonFocus()
    }

    private fun startTicker() {
        ticker?.cancel()
        ticker = viewModelScope.launch {
            while (true) {
                positionMs = runCatching { player?.currentPosition ?: 0 }.getOrDefault(0)
                delay(500)
            }
        }
    }

    private fun stopTicker() {
        ticker?.cancel()
        ticker = null
    }

    private fun randomIndex(): Int {
        if (tracks.size <= 1) return 0
        var next = Random.nextInt(tracks.size)
        if (next == currentIndex) next = (next + 1) % tracks.size
        return next
    }

    private fun requestFocus() {
        runCatching { audioManager?.requestAudioFocus(focusRequest) }
    }

    private fun abandonFocus() {
        runCatching { audioManager?.abandonAudioFocusRequest(focusRequest) }
    }

    override fun onCleared() {
        loadJob?.cancel()
        stopTicker()
        runCatching {
            player?.reset()
            player?.release()
        }
        player = null
        abandonFocus()
        super.onCleared()
    }
}
