package com.hanphone.blog

import com.hanphone.blog.data.model.LyricLine
import com.hanphone.blog.util.currentLyricIndex
import com.hanphone.blog.util.parseLrc
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** LRC 歌词解析与当前行定位（音乐库原生页用） */
class LrcTest {

    @Test
    fun parsesStandardLrcAndSkipsMetadata() {
        val lrc = """
            [ar:某歌手]
            [ti:某首歌]
            [00:00.00]作词 : 某人
            [00:12.34]第一句
            [01:02.50]第二句
        """.trimIndent()

        val lines = parseLrc(lrc)
        assertEquals(3, lines.size)
        assertEquals(0L, lines[0].timeMs)
        assertEquals("作词 : 某人", lines[0].text)
        assertEquals(12_340L, lines[1].timeMs)
        assertEquals("第一句", lines[1].text)
        assertEquals(62_500L, lines[2].timeMs)
    }

    @Test
    fun mergesTranslationByTimestamp() {
        val lrc = "[00:10.00]Hello\n[00:20.00]World"
        val tr = "[00:10.00]你好\n[00:20.00]世界"

        val lines = parseLrc(lrc, tr)
        assertEquals("Hello\n你好", lines[0].text)
        assertEquals("World\n世界", lines[1].text)
    }

    @Test
    fun expandsMultipleTimestampsOnOneLine() {
        val lines = parseLrc("[00:05.00][00:15.00]副歌")
        assertEquals(2, lines.size)
        assertEquals(5_000L, lines[0].timeMs)
        assertEquals(15_000L, lines[1].timeMs)
        assertEquals("副歌", lines[1].text)
    }

    @Test
    fun handlesMillisFormats() {
        val lines = parseLrc("[00:01]A\n[00:02.5]B\n[00:03.25]C\n[00:04.125]D")
        assertEquals(1_000L, lines[0].timeMs)
        assertEquals(2_500L, lines[1].timeMs)
        assertEquals(3_250L, lines[2].timeMs)
        assertEquals(4_125L, lines[3].timeMs)
    }

    @Test
    fun blankOrInstrumentalLrcYieldsNothing() {
        assertTrue(parseLrc(null).isEmpty())
        assertTrue(parseLrc("   ").isEmpty())
        assertTrue(parseLrc("[00:01.00]\n[00:02.00]").isEmpty())
    }

    @Test
    fun findsCurrentLyricLine() {
        val lines = listOf(
            LyricLine(1_000L, "a"),
            LyricLine(5_000L, "b"),
            LyricLine(9_000L, "c")
        )
        assertEquals(-1, currentLyricIndex(lines, 999))
        assertEquals(0, currentLyricIndex(lines, 1_000))
        assertEquals(1, currentLyricIndex(lines, 7_000))
        assertEquals(2, currentLyricIndex(lines, 10_000))
        assertEquals(-1, currentLyricIndex(emptyList(), 1_000))
    }
}
