package com.hanphone.blog.data.model

import com.squareup.moshi.Json
import java.util.Date

/** 后端统一响应包装：{ flag, code, message, data } */
data class ApiResult<T>(
    val flag: Boolean = false,
    val code: Int = 0,
    val message: String = "",
    val data: T? = null
)

/** Spring Data Page：content 为当前页数据，number 为 0 起始页码 */
data class PageResult<T>(
    val content: List<T> = emptyList(),
    val totalElements: Long = 0,
    val totalPages: Int = 0,
    val number: Int = 0
)

data class Blog(
    val id: Long,
    val title: String = "",
    val content: String = "",
    val firstPicture: String? = null,
    val flag: String? = null,
    val views: Int = 0,
    val likes: Int = 0,
    val liked: Boolean = false,
    val commentabled: Boolean = true,
    val recommend: Boolean = false,
    val description: String? = null,
    val createTime: Date? = null,
    val updateTime: Date? = null,
    val type: Type? = null,
    val tags: List<Tag> = emptyList(),
    val user: User? = null
)

data class Type(
    val id: Long,
    val name: String = "",
    @Json(name = "pic_url") val picUrl: String? = null,
    val color: String? = null
)

data class Tag(
    val id: Long,
    val name: String = ""
)

/** 公开接口返回的用户（后端已忽略登录地理位置等敏感字段）；type: "1" 管理员 / "0" 普通用户 */
data class User(
    val id: Long,
    val nickname: String? = null,
    val username: String? = null,
    val avatar: String? = null,
    val type: String? = null,
    val email: String? = null
)

data class Comment(
    val id: Long,
    val userId: Long? = null,
    val nickname: String = "匿名",
    val avatar: String? = null,
    val content: String = "",
    val createTime: Date? = null,
    val adminComment: Boolean = false
)

data class Essay(
    val id: Long,
    val title: String = "",
    val content: String = "",
    val image: String? = null,
    val likes: Int = 0,
    val liked: Boolean = false,
    val recommend: Boolean = false,
    val createTime: Date? = null,
    val user: User? = null,
    val essayFileUrls: List<EssayFileUrl> = emptyList()
)

data class EssayFileUrl(
    val id: Long = 0,
    val url: String? = null,
    val urlType: String? = null,
    /** 原图宽高（px），用于占位避免布局抖动；老数据为 null */
    val width: Int? = null,
    val height: Int? = null,
    /** 列表/九宫格用的小图 URL；老数据与外链附件为 null，回退 url */
    val thumbPath: String? = null
) {
    /**
     * 九宫格展示地址：优先缩略图，缺失时回退原图。
     *
     * 原图单张可达十几 MB，一篇随笔最多挂 8 张（实测合计约 38MB），
     * 直出会同时打爆 App 与 2C2G 的服务器。
     */
    fun displayUrl(): String? = thumbPath?.takeIf { it.isNotBlank() } ?: url

    /** 详情页大图地址：始终用原图，保证画质 */
    fun originalUrl(): String? = url
}

data class EssayComment(
    val id: Long,
    val user: User? = null,
    val content: String = "",
    val createTime: Date? = null,
    val adminComment: Boolean = false,
    val parentCommentId: Long? = null
)

data class Message(
    val id: Long,
    val nickname: String = "匿名",
    val avatar: String? = null,
    val content: String = "",
    val createTime: Date? = null,
    val adminMessage: Boolean = false,
    @Json(name = "parentMessage") val parentMessage: Message? = null
)

data class FriendLink(
    val id: Long,
    val name: String = "",
    val description: String = "",
    val url: String = "",
    val avatar: String? = null,
    val color: String? = null,
    val recommend: Boolean = false,
    val type: String = "friend"
)

/**
 * 项目（GET /projects 公开列表；后端已过滤 type=0 不展示项）。
 * type: 1 完整项目 / 2 工具箱 / 3 小游戏 / 4 小练习
 */
data class Project(
    val id: Long,
    val title: String = "",
    val content: String = "",
    @Json(name = "pic_url") val picUrl: String? = null,
    val url: String? = null,
    val techs: String = "",
    val type: Int = 0,
    val recommend: Boolean = false
)

/**
 * 文库文件（GET /docs 公开列表；后端已过滤未发布项）。
 * docNamespace 形如 "blog/docs" 或 "blog/docs/子目录"（对应 web 的文件夹层级）。
 */
data class Doc(
    val id: Long = 0,
    @Json(name = "docId") val docId: String = "",
    val title: String = "",
    val description: String = "",
    val filename: String = "",
    @Json(name = "fileType") val fileType: String = "",
    @Json(name = "docNamespace") val docNamespace: String = "",
    val viewCount: Long = 0,
    val recommend: Boolean = false,
    val createTime: String = ""
)

/** 全局搜索结果项（contentType: BLOG/ESSAY/DOC/PROJECT） */
data class SearchResultItem(
    val id: Long = 0,
    val title: String = "",
    val description: String = "",
    val contentType: String = "",
    val url: String? = null,
    val external: Boolean = false,
    val score: Int = 0,
    val updateTime: String? = null
)

/** /site-stats 返回 Map<String,Long> 键与该字段名一致 */
data class SiteStats(
    val blogCount: Long = 0,
    val essayCount: Long = 0,
    val projectCount: Long = 0,
    val messageCount: Long = 0,
    val docCount: Long = 0
)

/** POST /login 返回 data：{ user, token, expire }（expire 兼容数字/字符串） */
data class LoginData(
    val user: User? = null,
    val token: String? = null,
    val expire: String? = null
)