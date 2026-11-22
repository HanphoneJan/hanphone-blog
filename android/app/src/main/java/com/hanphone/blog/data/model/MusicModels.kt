package com.hanphone.blog.data.model

/** 音乐曲目（/next-api/music?type=playlist 的数组项） */
data class MusicTrack(
    val id: String = "",
    val title: String = "",
    val author: String = "",
    /** 播放地址；歌单接口里为空，按 id 单独取 */
    val url: String = "",
    /** 封面：可能是 http(s) 地址，也可能是图片 id */
    val pic: String = "",
    val lrc: String = ""
)

/** /next-api/music?type=song 的响应 */
data class MusicSongUrl(
    val url: String? = null,
    val size: Long? = null,
    val br: Int? = null
)

/** /next-api/music?type=lrc 的响应 */
data class MusicLyric(
    val lyric: String? = null,
    val tlyric: String? = null
)

/** 解析后的歌词行（毫秒时间戳，翻译已合并） */
data class LyricLine(
    val timeMs: Long,
    val text: String
)
