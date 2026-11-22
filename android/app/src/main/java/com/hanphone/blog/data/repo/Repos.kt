package com.hanphone.blog.data.repo

import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.api.BlogApi
import com.hanphone.blog.data.api.FileApi
import com.hanphone.blog.data.api.UploadAvatarResult
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.chat.ChatMessagesResponse
import com.hanphone.blog.data.chat.ChatUnreadResponse
import com.hanphone.blog.data.chat.ChatUsersResponse
import com.hanphone.blog.data.chat.ChatAdminResponse
import com.hanphone.blog.data.chat.DeviceAck
import com.hanphone.blog.data.chat.DeviceTokenBody
import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.data.model.BenchmarkMeta
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.BookmarkItem
import com.hanphone.blog.data.model.BookmarkStatus
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayComment
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotFeedItem
import com.hanphone.blog.data.model.HotOverview
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.LeaderboardTrend
import com.hanphone.blog.data.model.LoginData
import com.hanphone.blog.data.model.LoginSession
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.model.ModelBenchmarkRow
import com.hanphone.blog.data.model.ModelCompare
import com.hanphone.blog.data.model.ModelLeaderboard
import com.hanphone.blog.data.model.MusicLyric
import com.hanphone.blog.data.model.MusicSongUrl
import com.hanphone.blog.data.model.MusicTrack
import com.hanphone.blog.data.model.NotificationPage
import com.hanphone.blog.data.model.PageResult
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.UnreadCount
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.model.Vendor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import com.hanphone.blog.util.md5Hex

private const val PAGE_SIZE = 10

/** 博客 + 站点元信息 */
class BlogRepository(private val api: BlogApi = ApiClient.api) {

    suspend fun blogs(page: Int = 1, size: Int = PAGE_SIZE): ApiResult<PageResult<Blog>> =
        withContext(Dispatchers.IO) { api.blogs(page, size) }

    suspend fun blog(id: Long): ApiResult<Blog> =
        withContext(Dispatchers.IO) { api.blog(id) }

    /** 推荐位文章（详情页底部「相关推荐」的回退来源） */
    suspend fun recommendBlogs(): ApiResult<List<Blog>> =
        withContext(Dispatchers.IO) { api.recommendBlogs() }

    /** 随机文章（详情页底部「相关推荐」优先来源；excludeId 排除当前文章） */
    suspend fun randomBlogs(excludeId: Long?, size: Int = 3): ApiResult<List<Blog>> =
        withContext(Dispatchers.IO) { api.randomBlogs(excludeId, size) }

    /** page 统一使用 1 起始，内部转成 Spring 的 0 起始 */
    suspend fun blogsByType(typeId: Long, page: Int = 1, size: Int = PAGE_SIZE): ApiResult<PageResult<Blog>> =
        withContext(Dispatchers.IO) { api.blogsByType(typeId, page - 1, size) }

    suspend fun blogsByTag(tagId: Long, page: Int = 1, size: Int = PAGE_SIZE): ApiResult<PageResult<Blog>> =
        withContext(Dispatchers.IO) { api.blogsByTag(tagId, page - 1, size) }

    suspend fun fullTypes(): ApiResult<List<Type>> =
        withContext(Dispatchers.IO) { api.fullTypeList() }

    suspend fun fullTags(): ApiResult<List<Tag>> =
        withContext(Dispatchers.IO) { api.fullTagList() }

    suspend fun archiveBlog(): ApiResult<Map<String, List<Blog>>> =
        withContext(Dispatchers.IO) { api.archiveBlog() }

    suspend fun siteStats(): ApiResult<SiteStats> =
        withContext(Dispatchers.IO) { api.siteStats() }

    suspend fun visitCount(): ApiResult<Long> =
        withContext(Dispatchers.IO) { api.visitCount() }

    suspend fun friendLinks(): ApiResult<List<FriendLink>> =
        withContext(Dispatchers.IO) { api.friendLinks() }

    /**
     * 申请友链（免登录）。requestId 用于 @Idempotent：失败重试必须复用同一个 id，
     * 成功后才换新，调用方负责。
     */
    suspend fun applyFriendLink(
        requestId: String,
        name: String,
        url: String,
        description: String,
        avatar: String? = null,
        siteshot: String? = null,
        rss: String? = null,
        nickname: String? = null,
        color: String? = null,
        applyText: String? = null
    ): ApiResult<FriendLink> = withContext(Dispatchers.IO) {
        api.applyFriendLink(
            requestId = requestId,
            body = buildMap {
                put("name", name)
                put("url", url)
                put("description", description)
                put("type", "friend")
                put("recommend", false)
                put("published", false)
                put("avatar", avatar)
                put("siteshot", siteshot)
                put("rss", rss)
                put("nickname", nickname)
                put("color", color)
                if (applyText != null) put("applyText", applyText)
            }
        )
    }

    /** 全局搜索；type = null 为全部，类型过滤由服务端完成 */
    suspend fun search(query: String, type: String? = null, limit: Int = 20): ApiResult<List<SearchResultItem>> =
        withContext(Dispatchers.IO) { api.search(query, type, limit) }

    /** 全部公开项目（type 可为 null 拉全量，前端分组筛选） */
    suspend fun projects(type: Int? = null): ApiResult<List<Project>> =
        withContext(Dispatchers.IO) { api.projects(type) }

    /** 文库全部公开文件（前端按 docNamespace 构建文件夹树） */
    suspend fun docs(): ApiResult<List<Doc>> =
        withContext(Dispatchers.IO) { api.docs() }

    /** 打开文件时上报浏览量（失败不影响主流程） */
    suspend fun incrementDocView(docId: String) {
        runCatching { withContext(Dispatchers.IO) { api.incrementDocView(docId) } }
    }

    suspend fun comments(blogId: Long): ApiResult<List<Comment>> =
        withContext(Dispatchers.IO) { api.comments(blogId) }

    suspend fun postComment(
        blogId: Long,
        content: String,
        nickname: String,
        email: String,
        avatar: String = ""
    ): ApiResult<Comment> = withContext(Dispatchers.IO) {
        api.postComment(
            requestId = ApiClient.newRequestId(),
            body = mapOf(
                "blogId" to blogId,
                "content" to content,
                "nickname" to nickname,
                "email" to email,
                "avatar" to avatar,
                "parentId" to -1L
            )
        )
    }

    /** 登录用户发表评论（对齐网页版：携带 userId，后端取本人资料，无需昵称/邮箱） */
    suspend fun postCommentAsUser(
        blogId: Long,
        userId: Long,
        content: String,
        parentId: Long = -1L
    ): ApiResult<Comment> = withContext(Dispatchers.IO) {
        api.postComment(
            requestId = ApiClient.newRequestId(),
            body = mapOf(
                "blogId" to blogId,
                "content" to content,
                "userId" to userId,
                "parentId" to parentId
            )
        )
    }

    suspend fun likeBlog(blogId: Long, userId: Long, isLike: Boolean): ApiResult<Any?> =
        withContext(Dispatchers.IO) {
            api.likeBlog(
                id = blogId,
                body = mapOf(
                    "userId" to userId,
                    "blogId" to blogId,
                    "isLike" to isLike
                )
            )
        }

    /** 退出登录：吊销服务端会话（refresh 失效），失败也不影响本地清理 */
    suspend fun logout(refreshToken: String?): ApiResult<Any?> =
        withContext(Dispatchers.IO) {
            api.logout(mapOf("refreshToken" to (refreshToken ?: "")))
        }

    /** 当前账号的登录设备列表（需登录；Token 由拦截器注入） */
    suspend fun sessions(): ApiResult<List<LoginSession>> =
        withContext(Dispatchers.IO) { api.sessions() }

    /** 下线指定设备；下线的若是本机，页面还要走本地退出清理 */
    suspend fun revokeSession(sid: String): ApiResult<Any?> =
        withContext(Dispatchers.IO) { api.revokeSession(sid) }

    /** 登录：入参是明文密码，这里统一做 md5（后端存的是 bcrypt(md5)） */
    suspend fun login(username: String, password: String): ApiResult<LoginData> =
        withContext(Dispatchers.IO) {
            api.login(mapOf("username" to username, "password" to md5Hex(password)))
        }

    /** 第三方登录：一次性 code 换会话并落盘（保存逻辑在 core/LoginSession.applyLogin） */
    suspend fun exchangeOAuthCode(code: String): ApiResult<LoginData> =
        withContext(Dispatchers.IO) {
            api.exchangeOAuthCode(mapOf("code" to code))
        }

    suspend fun sendRegisterCaptcha(email: String): ApiResult<Any?> =
        withContext(Dispatchers.IO) {
            api.sendCaptcha(mapOf("email" to email, "scene" to "register"))
        }

    /** 登录用户完整资料（含邮箱等非公开字段，仅本人可见） */
    suspend fun currentUser(userId: Long): ApiResult<User> =
        withContext(Dispatchers.IO) { api.currentUser(mapOf("userId" to userId)) }

    /** 更新当前登录用户资料（后端只更新非空字段：nickname/avatar 等） */
    suspend fun updateCurrentUser(userId: Long, user: Map<String, String>): ApiResult<User> =
        withContext(Dispatchers.IO) { api.updateCurrentUser(mapOf("userId" to userId, "user" to user)) }

    /** 完整资料更新（对齐网页 UserInfoForm）：支持改邮箱带验证码，密码传 md5 摘要 */
    suspend fun updateCurrentUserFull(userId: Long, user: Map<String, String>, captcha: String? = null): ApiResult<User> =
        withContext(Dispatchers.IO) {
            val body = mutableMapOf<String, Any?>("userId" to userId, "user" to user)
            if (!captcha.isNullOrBlank()) body["captcha"] = captcha
            api.updateCurrentUser(body)
        }

    /** 通用邮箱验证码（scene 默认 general：改邮箱/重置密码等） */
    suspend fun sendGeneralCaptcha(email: String): ApiResult<Any?> =
        withContext(Dispatchers.IO) { api.sendCaptcha(mapOf("email" to email)) }

    /** 重置密码：明文密码在仓库层统一 md5（后端存 bcrypt(md5)） */
    suspend fun resetPassword(email: String, captcha: String, newPassword: String): ApiResult<Any?> =
        withContext(Dispatchers.IO) {
            api.resetPassword(
                mapOf(
                    "email" to email,
                    "captcha" to captcha,
                    "newPassword" to md5Hex(newPassword)
                )
            )
        }

    /** 私信：拉取与管理员的历史记录（需 Bearer token） */
    suspend fun adminMessages(token: String): ChatMessagesResponse =
        withContext(Dispatchers.IO) { api.adminMessages("Bearer $token") }

    /** 管理员：全部用户列表 */
    suspend fun chatUsers(token: String): ChatUsersResponse =
        withContext(Dispatchers.IO) { api.chatUsers("Bearer $token") }

    /** 管理员：收件箱未读数 */
    suspend fun chatUnread(token: String): ChatUnreadResponse =
        withContext(Dispatchers.IO) { api.chatUnread("Bearer $token") }

    /** 普通用户：博主（管理员）资料（私信页昵称/头像） */
    suspend fun chatAdmin(token: String): ChatAdminResponse =
        withContext(Dispatchers.IO) { api.chatAdmin("Bearer $token") }

    /** 管理员：与指定用户的历史记录 */
    suspend fun chatMessagesWithUser(token: String, userId: Long): ChatMessagesResponse =
        withContext(Dispatchers.IO) { api.chatMessagesWithUser(userId, "Bearer $token") }

    /** 上报 FCM 设备令牌：已登录关联用户（收私信推送），未登录为匿名（仅收热点推送） */
    suspend fun registerDevice(deviceToken: String, platform: String = "android"): DeviceAck =
        withContext(Dispatchers.IO) {
            api.registerDevice(
                TokenStore.token.value?.let { "Bearer $it" },
                DeviceTokenBody(deviceToken, platform)
            )
        }

    /** 移除 FCM 设备令牌（关闭通知/清除数据） */
    suspend fun removeDevice(deviceToken: String): DeviceAck =
        withContext(Dispatchers.IO) {
            api.removeDevice(
                TokenStore.token.value?.let { "Bearer $it" },
                DeviceTokenBody(deviceToken)
            )
        }

    /** 上报 FCM 设备令牌到博客 server（博客直接发热点推送；Token 头由拦截器注入关联用户） */
    suspend fun registerDeviceToBlog(deviceToken: String, platform: String = "android"): DeviceAck =
        withContext(Dispatchers.IO) { api.registerBlogDevice(DeviceTokenBody(deviceToken, platform)) }

    /** 从博客 server 移除 FCM 设备令牌 */
    suspend fun removeDeviceFromBlog(deviceToken: String): DeviceAck =
        withContext(Dispatchers.IO) { api.removeBlogDevice(DeviceTokenBody(deviceToken)) }

    suspend fun register(
        username: String,
        nickname: String,
        email: String,
        password: String,
        avatar: String,
        captcha: String
    ): ApiResult<LoginData> = withContext(Dispatchers.IO) {
        api.register(
            mapOf(
                "username" to username,
                "nickname" to nickname,
                "email" to email,
                "password" to md5Hex(password),
                "avatar" to avatar,
                "captcha" to captcha
            )
        )
    }
}

/** 随笔 */
class EssayRepository(private val api: BlogApi = ApiClient.api) {

    suspend fun essays(page: Int = 1, pageSize: Int = PAGE_SIZE): ApiResult<PageResult<Essay>> =
        withContext(Dispatchers.IO) { api.essays(page, pageSize) }

    suspend fun essay(id: Long): ApiResult<Essay> =
        withContext(Dispatchers.IO) { api.essay(id) }

    suspend fun comments(essayId: Long): ApiResult<List<EssayComment>> =
        withContext(Dispatchers.IO) { api.essayComments(essayId) }

    suspend fun likeEssay(essayId: Long, userId: Long, isLike: Boolean): ApiResult<Any?> =
        withContext(Dispatchers.IO) {
            api.likeEssay(
                id = essayId,
                body = mapOf(
                    "userId" to userId,
                    "essayId" to essayId,
                    "isLike" to isLike
                )
            )
        }

    suspend fun postEssayComment(
        essayId: Long,
        userId: Long,
        content: String,
        parentCommentId: Long = -1L
    ): ApiResult<EssayComment> =
        withContext(Dispatchers.IO) {
            api.postEssayComment(
                id = essayId,
                requestId = ApiClient.newRequestId(),
                body = mapOf(
                    "content" to content,
                    "userId" to userId,
                    "parentCommentId" to parentCommentId
                )
            )
        }
}

/** 留言板 */
class MessageRepository(private val api: BlogApi = ApiClient.api) {

    suspend fun messages(): ApiResult<List<Message>> =
        withContext(Dispatchers.IO) { api.messages() }

    suspend fun postMessage(nickname: String, content: String, avatar: String = "", parentId: Long = -1L): ApiResult<Message> =
        withContext(Dispatchers.IO) {
            api.postMessage(
                requestId = ApiClient.newRequestId(),
                body = mapOf(
                    "message" to mapOf(
                        "content" to content,
                        "nickname" to nickname,
                        "avatar" to avatar,
                        "parentId" to parentId
                    )
                )
            )
        }
}

/** 站内通知（/notifications，均需登录；Token 头由 ApiClient 拦截器注入） */
class NotificationRepository(private val api: BlogApi = ApiClient.api) {

    /** page 1 起始，与后端一致 */
    suspend fun page(page: Int = 1, size: Int = 20): ApiResult<NotificationPage> =
        withContext(Dispatchers.IO) { api.notifications(page, size) }

    suspend fun unreadCount(): ApiResult<UnreadCount> =
        withContext(Dispatchers.IO) { api.notificationUnreadCount() }

    suspend fun markRead(id: Long): ApiResult<Any?> =
        withContext(Dispatchers.IO) { api.markNotificationRead(id) }

    /** 全部已读，返回更新条数 */
    suspend fun markAllRead(): ApiResult<Int> =
        withContext(Dispatchers.IO) { api.markAllNotificationsRead() }
}

/** 收藏（/bookmarks，均需登录；type = BLOG / ESSAY / DOC） */
class BookmarkRepository(private val api: BlogApi = ApiClient.api) {

    /** type 为 null 时返回全部收藏（顺序由后端按创建时间倒序） */
    suspend fun list(type: String? = null): ApiResult<List<BookmarkItem>> =
        withContext(Dispatchers.IO) { api.bookmarks(type) }

    suspend fun status(type: String, key: String): ApiResult<BookmarkStatus> =
        withContext(Dispatchers.IO) { api.bookmarkStatus(type, key) }

    suspend fun add(type: String, key: String): ApiResult<BookmarkStatus> =
        withContext(Dispatchers.IO) { api.addBookmark(mapOf("type" to type, "key" to key)) }

    suspend fun remove(type: String, key: String): ApiResult<BookmarkStatus> =
        withContext(Dispatchers.IO) { api.removeBookmark(type, key) }
}

/** 文件服务（admin-file 上传） */
class FileRepository(private val api: FileApi = ApiClient.fileApi) {

    suspend fun uploadAvatar(file: File): UploadAvatarResult = withContext(Dispatchers.IO) {
        val mediaType = "image/*".toMediaType()
        val body = file.asRequestBody(mediaType)
        val part = MultipartBody.Part.createFormData("avatar", file.name, body)
        api.uploadAvatar(part)
    }
}

/** 音乐库（Next BFF /next-api/music，公开只读）。失败由 ViewModel try/catch */
class MusicRepository(private val api: BlogApi = ApiClient.api) {

    /** 歌单 id 与网页版保持一致（网易云歌单 2093306814） */
    companion object {
        const val PLAYLIST_ID = "2093306814"
        const val COVER_BASE = "https://hanphone.cn/next-api/music"
    }

    suspend fun playlist(id: String = PLAYLIST_ID): List<MusicTrack> =
        withContext(Dispatchers.IO) { api.musicPlaylist(id = id) }

    suspend fun songUrl(id: String): String? =
        withContext(Dispatchers.IO) { api.musicSongUrl(id = id).url?.takeIf { it.isNotBlank() } }

    suspend fun lyric(id: String): MusicLyric =
        withContext(Dispatchers.IO) { api.musicLyric(id = id) }

    /** 封面地址：优先直接用曲目里的 http(s) 地址，否则走 BFF 的 pic 代理 */
    fun coverUrl(track: MusicTrack): String {
        val pic = track.pic
        if (pic.startsWith("http://") || pic.startsWith("https://")) {
            return pic.replaceFirst("http://", "https://")
        }
        val id = pic.ifBlank { track.id }
        return "$COVER_BASE?server=netease&type=pic&id=$id"
    }
}

/** 热点聚合（洞察接口 /hot 路径，公开只读）。网络异常由 ViewModel 层 try/catch */
class HotRepository(private val api: BlogApi = ApiClient.api) {

    suspend fun overview(): ApiResult<HotOverview> =
        withContext(Dispatchers.IO) { api.hotOverview() }

    suspend fun feed(category: String?, limit: Int = 30): ApiResult<List<HotFeedItem>> =
        withContext(Dispatchers.IO) { api.hotFeed(category, limit) }

    suspend fun sources(): ApiResult<List<HotSourceStatus>> =
        withContext(Dispatchers.IO) { api.hotSources() }

    suspend fun leaderboard(modality: String, normalized: Boolean = true): ApiResult<ModelLeaderboard> =
        withContext(Dispatchers.IO) { api.hotLeaderboard(modality, normalized) }

    suspend fun benchmarks(): ApiResult<List<BenchmarkMeta>> =
        withContext(Dispatchers.IO) { api.hotBenchmarks() }

    suspend fun vendors(normalized: Boolean = true): ApiResult<List<Vendor>> =
        withContext(Dispatchers.IO) { api.hotVendors(normalized) }

    /** 模型列表：按厂商（规范名）或关键词过滤；sort = newest/name/price/context */
    suspend fun listModels(
        query: String?,
        vendor: String?,
        sort: String = "newest",
        limit: Int = 30,
        normalized: Boolean = true
    ): ApiResult<List<ModelBenchmarkRow>> =
        withContext(Dispatchers.IO) { api.hotModels(query, vendor, sort, limit, normalized) }

    suspend fun compare(keys: List<String>, normalized: Boolean = true): ApiResult<ModelCompare> =
        withContext(Dispatchers.IO) { api.hotCompare(keys, normalized) }

    suspend fun leaderboardTrend(modality: String, days: Int = 30, top: Int = 5): ApiResult<LeaderboardTrend> =
        withContext(Dispatchers.IO) { api.hotLeaderboardTrend(modality, days, top) }
}