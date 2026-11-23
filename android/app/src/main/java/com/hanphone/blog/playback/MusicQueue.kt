package com.hanphone.blog.playback

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import com.hanphone.blog.data.model.MusicTrack

/** 播放模式：列表循环 / 单曲循环 / 随机 */
enum class PlayMode(val label: String) {
    LIST("列表循环"),
    SINGLE("单曲循环"),
    SHUFFLE("随机播放");

    fun next(): PlayMode = when (this) {
        LIST -> SINGLE
        SINGLE -> SHUFFLE
        SHUFFLE -> LIST
    }
}

/**
 * 队列构造与播放模式映射：**纯逻辑**，不持有播放器/上下文，方便 JVM 单测。
 *
 * 队列里的音频地址不写死成网易云 CDN 的签名 URL（会过期，且换设备/换网络后可能失效），
 * 统一用自定义 URI `hanphone-music:track/{id}`，由 [MusicPlaybackService] 在真正打开时
 * 按 id 换一次真实地址——这样即使界面已经销毁，服务自动下一首也仍然能取到地址。
 */
object MusicQueue {

    /**
     * 网易云 CDN 对 stagefright 的默认 UA 返回 403（见 HANDOVER 坑 45），
     * 必须伪装成浏览器；Referer 一并带上。由服务的数据源统一加，UI 不参与。
     */
    const val BROWSER_UA =
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/120.0.0.0 Mobile Safari/537.36"
    const val REFERER = "https://music.163.com/"

    private const val TRACK_PREFIX = "hanphone-music:track/"

    /** 曲目 → 自定义播放 URI（只带 id，不带会过期的地址） */
    fun trackUri(trackId: String): String = TRACK_PREFIX + trackId

    /** 自定义播放 URI → 曲目 id；不是本 App 的队列 URI 时返回 null */
    fun trackIdFromUri(uri: String?): String? {
        if (uri.isNullOrBlank() || !uri.startsWith(TRACK_PREFIX)) return null
        return uri.removePrefix(TRACK_PREFIX).takeIf { it.isNotBlank() }
    }

    /** 播放模式 → ExoPlayer 的 repeat/shuffle 组合 */
    fun repeatModeOf(mode: PlayMode): Int = when (mode) {
        PlayMode.SINGLE -> Player.REPEAT_MODE_ONE
        PlayMode.LIST, PlayMode.SHUFFLE -> Player.REPEAT_MODE_ALL
    }

    fun shuffleOf(mode: PlayMode): Boolean = mode == PlayMode.SHUFFLE

    /** 从播放器状态反推播放模式（重新进页面时回填按钮图标） */
    fun playModeOf(repeatMode: Int, shuffleEnabled: Boolean): PlayMode = when {
        repeatMode == Player.REPEAT_MODE_ONE -> PlayMode.SINGLE
        shuffleEnabled -> PlayMode.SHUFFLE
        else -> PlayMode.LIST
    }

    /**
     * 歌单 → MediaItem 队列。
     * - `mediaId` = 曲目 id（歌词/通知/回填都靠它认歌）
     * - 标题/歌手/封面写进 metadata，通知栏与锁屏直接显示，不依赖界面存活
     */
    fun items(tracks: List<MusicTrack>, coverUrlOf: (MusicTrack) -> String): List<MediaItem> =
        tracks.map { track ->
            val cover = coverUrlOf(track).takeIf { it.startsWith("https://") }
            MediaItem.Builder()
                .setMediaId(track.id)
                .setUri(trackUri(track.id))
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(track.title.ifBlank { "未知歌曲" })
                        .setArtist(track.author)
                        .setArtworkUri(cover?.let(Uri::parse))
                        .setIsBrowsable(false)
                        .setIsPlayable(true)
                        .build()
                )
                .build()
        }
}
