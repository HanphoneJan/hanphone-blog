package com.hanphone.blog

import com.hanphone.blog.data.model.MusicSongUrl
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * `/next-api/music?type=song` 的解析回归。
 *
 * 坑（2026-11 真机 + 压测发现）：BFF 的 `br` 是按文件大小算出来的**小数**（如 `320.004`），
 * 偶尔正好是 `320`。模型写成 `Int?` 时 Moshi 抛
 * `JsonDataException: Expected an int but was 320.004 at path $.br`，
 * 表现为「点开某些歌就播放失败」——与连点切歌无关，只是切得快更容易撞上。
 */
class MusicSongUrlJsonTest {

    private val adapter = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
        .adapter(MusicSongUrl::class.java)

    @Test
    fun fractionalBitrateParses() {
        val json = """{"url":"https://m804.music.126.net/a.mp3","size":3602852,"br":320.004}"""
        val parsed = adapter.fromJson(json)
        assertNotNull(parsed)
        assertEquals("https://m804.music.126.net/a.mp3", parsed?.url)
        assertEquals(3602852L, parsed?.size)
        assertEquals(320.004, parsed?.br ?: 0.0, 1e-9)
    }

    @Test
    fun integerBitrateStillParses() {
        val parsed = adapter.fromJson("""{"url":"https://x/a.mp3","size":13198150,"br":320}""")
        assertEquals(320.0, parsed?.br ?: 0.0, 1e-9)
    }

    @Test
    fun missingUrlIsNullSoUiCanShowFallback() {
        val parsed = adapter.fromJson("""{"url":null,"size":null,"br":null}""")
        assertNotNull(parsed)
        assertNull(parsed?.url)
    }
}
