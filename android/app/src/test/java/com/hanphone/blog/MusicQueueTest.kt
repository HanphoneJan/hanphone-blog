package com.hanphone.blog

import androidx.media3.common.Player
import com.hanphone.blog.playback.MusicQueue
import com.hanphone.blog.playback.PlayMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 队列纯逻辑回归：自定义播放 URI 编解码、播放模式 ↔ repeat/shuffle 映射。
 * 这些函数被后台服务直接使用，出错会导致「服务自动下一首拿不到地址」或模式按钮错位。
 */
class MusicQueueTest {

    @Test
    fun trackUriRoundTrip() {
        val uri = MusicQueue.trackUri("1974443814")
        assertEquals("hanphone-music:track/1974443814", uri)
        assertEquals("1974443814", MusicQueue.trackIdFromUri(uri))
    }

    @Test
    fun nonQueueUrisAreNotMistakenForTracks() {
        assertNull(MusicQueue.trackIdFromUri(null))
        assertNull(MusicQueue.trackIdFromUri(""))
        assertNull(MusicQueue.trackIdFromUri("https://m804.music.126.net/a.mp3"))
        // 前缀对但没有 id
        assertNull(MusicQueue.trackIdFromUri("hanphone-music:track/"))
    }

    @Test
    fun playModeMapsToRepeatAndShuffle() {
        assertEquals(Player.REPEAT_MODE_ALL, MusicQueue.repeatModeOf(PlayMode.LIST))
        assertFalse(MusicQueue.shuffleOf(PlayMode.LIST))

        assertEquals(Player.REPEAT_MODE_ONE, MusicQueue.repeatModeOf(PlayMode.SINGLE))
        assertFalse(MusicQueue.shuffleOf(PlayMode.SINGLE))

        assertEquals(Player.REPEAT_MODE_ALL, MusicQueue.repeatModeOf(PlayMode.SHUFFLE))
        assertTrue(MusicQueue.shuffleOf(PlayMode.SHUFFLE))
    }

    @Test
    fun playModeRestoresFromPlayerState() {
        assertEquals(PlayMode.SINGLE, MusicQueue.playModeOf(Player.REPEAT_MODE_ONE, true))
        assertEquals(PlayMode.SHUFFLE, MusicQueue.playModeOf(Player.REPEAT_MODE_ALL, true))
        assertEquals(PlayMode.LIST, MusicQueue.playModeOf(Player.REPEAT_MODE_ALL, false))
        // 单曲循环优先于随机（repeat=ONE 时随机开关无意义）
        assertEquals(PlayMode.SINGLE, MusicQueue.playModeOf(Player.REPEAT_MODE_ONE, false))
    }

    @Test
    fun cyclingPlayModeWrapsAround() {
        assertEquals(PlayMode.SINGLE, PlayMode.LIST.next())
        assertEquals(PlayMode.SHUFFLE, PlayMode.SINGLE.next())
        assertEquals(PlayMode.LIST, PlayMode.SHUFFLE.next())
    }
}
