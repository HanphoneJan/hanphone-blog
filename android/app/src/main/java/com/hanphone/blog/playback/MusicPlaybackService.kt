package com.hanphone.blog.playback

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.util.Log
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.squareup.moshi.JsonDataException
import com.hanphone.blog.MainActivity
import com.hanphone.blog.data.repo.MusicRepository
import dagger.hilt.android.AndroidEntryPoint
import java.io.IOException
import java.io.InterruptedIOException
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

/**
 * 音乐库后台播放服务（前台服务 + MediaSession）。
 *
 * - 播放器归服务所有：离开页面、锁屏、划掉任务都继续播；通知栏/锁屏/蓝牙耳机按键
 *   通过 [MediaSession] 控制（播放/暂停/上一首/下一首/进度）。
 * - 音频地址**按次解析**：队列里只有 `hanphone-music:track/{id}`，真正打开时才按 id
 *   调 BFF 换取签名地址（带缓存），这样网易云 URL 过期、界面已销毁时自动下一首都不受影响。
 * - 网易云 CDN 的 UA/Referer 伪装放在数据源层（见 HANDOVER 坑 45），整条链路都生效。
 * - 从最近任务划掉 App 时播放中继续播（[MediaSessionService.onTaskRemoved] 的默认行为）；
 *   暂停/停止后通知与前台服务保留约 10 分钟（media3 的 user-engaged 超时）供恢复，之后服务自行结束，
 *   不常驻耗电；暂停时划掉通知（media3 的删除意图 = `COMMAND_STOP`）立即停止并结束服务。
 */
@AndroidEntryPoint
class MusicPlaybackService : MediaSessionService() {

    @Inject
    lateinit var repo: MusicRepository

    private var player: ExoPlayer? = null
    private var session: MediaSession? = null

    private data class CachedUrl(val url: String, val fetchedAt: Long)

    /** 曲目 id → 解析出的播放地址（网易云签名地址会过期，缓存只放一小会儿） */
    private val urlCache = HashMap<String, CachedUrl>()

    override fun onCreate() {
        super.onCreate()
        MusicNotifications.ensureChannel(this)

        // UA/Referer 必须在数据源层加：ExoPlayer 打开音频与解析重定向时都会带上
        val http = DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(
                mapOf(
                    "User-Agent" to MusicQueue.BROWSER_UA,
                    "Referer" to MusicQueue.REFERER
                )
            )
            .setAllowCrossProtocolRedirects(true)
        val resolving = ResolvingDataSource.Factory(
            DefaultDataSource.Factory(this, http)
        ) { dataSpec -> resolveTrackUri(dataSpec) }

        val exo = ExoPlayer.Builder(this)
            .setMediaSourceFactory(DefaultMediaSourceFactory(resolving))
            .build()
        exo.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(),
            /* handleAudioFocus = */ true
        )
        // 拔耳机/蓝牙断开自动暂停
        exo.setHandleAudioBecomingNoisy(true)
        // 息屏后 CPU 不休眠，网络流不会卡住
        exo.setWakeMode(C.WAKE_MODE_NETWORK)
        exo.repeatMode = Player.REPEAT_MODE_ALL
        player = exo

        session = MediaSession.Builder(this, exo)
            .setCallback(object : MediaSession.Callback {
                /**
                 * 界面把整张歌单塞进队列时，MediaItem 的 URI 是自定义 scheme，
                 * 要原样接受；默认实现只认可直接播放的地址，会把这些条目丢掉。
                 */
                override fun onAddMediaItems(
                    mediaSession: MediaSession,
                    controller: MediaSession.ControllerInfo,
                    mediaItems: List<MediaItem>
                ): ListenableFuture<List<MediaItem>> = Futures.immediateFuture(mediaItems)
            })
            // 点通知/锁屏封面回到音乐库页面（复用站内深链）
            .setSessionActivity(openMusicIntent())
            .build()

        setMediaNotificationProvider(
            DefaultMediaNotificationProvider.Builder(this)
                .setChannelId(MusicNotifications.CHANNEL_ID)
                .setNotificationId(MusicNotifications.NOTIFICATION_ID)
                .build()
        )
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onDestroy() {
        session?.release()
        session = null
        player?.release()
        player = null
        super.onDestroy()
    }

    // ------------------------------------------------------------------

    /** 自定义队列 URI → 真实播放地址（带短缓存）；不是队列 URI 的原样放行 */
    private fun resolveTrackUri(dataSpec: DataSpec): DataSpec {
        val trackId = MusicQueue.trackIdFromUri(dataSpec.uri.toString()) ?: return dataSpec

        val now = SystemClock.elapsedRealtime()
        val cached = urlCache[trackId]
        if (cached != null && now - cached.fetchedAt < URL_TTL_MS) {
            return dataSpec.withUri(Uri.parse(cached.url))
        }

        val url = resolveSongUrl(trackId)
        urlCache[trackId] = CachedUrl(url, SystemClock.elapsedRealtime())
        return dataSpec.withUri(Uri.parse(url))
    }

    /**
     * 按 id 换真实地址。两处针对「连续点下一首」的处理：
     *
     * 1. **先静置 [SETTLE_MS]**：每切一首 ExoPlayer 都会 `cancelLoad()` 并中断加载线程。
     *    没有这拍时，被切走的每首都会先发出一次 `type=song` 请求（实测连点 15 次 = 16 个请求 +
     *    30 个歌词请求），瞬间把上游打成限流，返回 `url:null`，最后一首就成了「播放失败」。
     *    被切走的那首都在这 250ms 里被中断，requests 不会发出去。
     * 2. **失败重试 [RESOLVE_ATTEMPTS] 次**（间隔 300/600ms）：上游偶发 `url:null` 时自动恢复。
     *
     * 中断在这里统一转成 [InterruptedIOException]：这代表「这首歌已经被切走了」，
     * ExoPlayer 对已取消的加载会丢弃该异常，不会冒成用户可见的播放失败。
     */
    private fun resolveSongUrl(trackId: String): String {
        sleepInterruptibly(SETTLE_MS, trackId)

        var lastError: Throwable? = null
        repeat(RESOLVE_ATTEMPTS) { attempt ->
            val url = try {
                runBlocking(Dispatchers.IO) {
                    withTimeoutOrNull(REQUEST_TIMEOUT_MS) { repo.songUrl(trackId) }
                }
            } catch (e: CancellationException) {
                throw InterruptedIOException("切歌取消：$trackId")
            } catch (e: InterruptedException) {
                throw InterruptedIOException("切歌取消：$trackId")
            } catch (e: JsonDataException) {
                // 响应结构/类型不对（如 br 是小数）——重试也没用，直接失败但留下原因
                Log.w(TAG, "song url 响应解析失败：$trackId", e)
                throw IOException("音乐地址解析失败：$trackId", e)
            } catch (e: Exception) {
                lastError = e
                null
            }

            if (!url.isNullOrBlank()) return url
            if (attempt < RESOLVE_ATTEMPTS - 1) {
                sleepInterruptibly(RETRY_DELAY_MS * (attempt + 1), trackId)
            }
        }

        Log.w(TAG, "音乐地址解析失败：$trackId", lastError)
        throw IOException("音乐地址解析失败：$trackId")
    }

    /** 睡眠，被切歌中断时立即结束（不吞中断、不再发请求） */
    private fun sleepInterruptibly(ms: Long, trackId: String) {
        try {
            Thread.sleep(ms)
        } catch (e: InterruptedException) {
            throw InterruptedIOException("切歌取消：$trackId")
        }
    }

    private fun openMusicIntent(): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("hanphone://music"), this, MainActivity::class.java)
        return PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private companion object {
        const val TAG = "MusicPlayback"

        /** 解析出的地址缓存时长：网易云签名地址寿命远大于此，重开也不必每次请求 */
        const val URL_TTL_MS = 10 * 60 * 1000L

        /** 单次地址解析超时 */
        const val REQUEST_TIMEOUT_MS = 10_000L

        /** 静置时长：连点切歌时把中间那些「一闪而过」的曲目挡在网络请求之外 */
        const val SETTLE_MS = 250L

        /** 解析失败重试次数（上游偶发 url:null；响应类型错误不重试） */
        const val RESOLVE_ATTEMPTS = 2
        const val RETRY_DELAY_MS = 400L
    }
}
