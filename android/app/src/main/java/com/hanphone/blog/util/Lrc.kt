package com.hanphone.blog.util

import com.hanphone.blog.data.model.LyricLine

/**
 * LRC 歌词解析（纯函数，可 JVM 单测）。
 *
 * 支持：
 * - `[mm:ss.xx]` / `[mm:ss.xxx]` / `[mm:ss]` 时间戳；
 * - 一行多个时间戳（同一句重复出现）；
 * - 翻译歌词（tlyric）：按时间戳精确合并且换行显示；
 * - 忽略 `[ar:]` `[ti:]` 等元信息行与空行。
 */
private val TIME_TAG = Regex("""\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]""")

private fun tagToMs(minute: String, second: String, fraction: String?): Long {
    val m = minute.toLongOrNull() ?: 0
    val s = second.toLongOrNull() ?: 0
    val ms = when (fraction?.length) {
        1 -> (fraction.toLongOrNull() ?: 0) * 100
        2 -> (fraction.toLongOrNull() ?: 0) * 10
        3 -> fraction.toLongOrNull() ?: 0
        else -> 0
    }
    return (m * 60 + s) * 1000 + ms
}

fun parseLrc(lyric: String?, translation: String? = null): List<LyricLine> {
    if (lyric.isNullOrBlank()) return emptyList()

    val translated = if (translation.isNullOrBlank()) emptyMap() else {
        buildMap {
            for (raw in translation.lines()) {
                val tags = TIME_TAG.findAll(raw).toList()
                if (tags.isEmpty()) continue
                val text = raw.substring(tags.last().range.last + 1).trim()
                if (text.isEmpty()) continue
                for (tag in tags) {
                    val ms = tagToMs(tag.groupValues[1], tag.groupValues[2], tag.groupValues[3])
                    put(ms, text)
                }
            }
        }
    }

    val result = mutableListOf<LyricLine>()
    for (raw in lyric.lines()) {
        val tags = TIME_TAG.findAll(raw).toList()
        if (tags.isEmpty()) continue
        val text = raw.substring(tags.last().range.last + 1).trim()
        if (text.isEmpty()) continue
        for (tag in tags) {
            val ms = tagToMs(tag.groupValues[1], tag.groupValues[2], tag.groupValues[3])
            val tr = translated[ms]
            result += LyricLine(ms, if (tr.isNullOrBlank()) text else "$text\n$tr")
        }
    }
    return result.sortedBy { it.timeMs }
}

/** 当前播放位置对应的歌词下标；没有匹配返回 -1 */
fun currentLyricIndex(lines: List<LyricLine>, positionMs: Long): Int {
    if (lines.isEmpty()) return -1
    var lo = 0
    var hi = lines.lastIndex
    var ans = -1
    while (lo <= hi) {
        val mid = (lo + hi) / 2
        if (lines[mid].timeMs <= positionMs) {
            ans = mid
            lo = mid + 1
        } else {
            hi = mid - 1
        }
    }
    return ans
}
