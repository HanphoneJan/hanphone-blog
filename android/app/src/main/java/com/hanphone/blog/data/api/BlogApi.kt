package com.hanphone.blog.data.api

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
import com.hanphone.blog.data.model.NotificationPage
import com.hanphone.blog.data.model.UnreadCount
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
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.model.ModelBenchmarkRow
import com.hanphone.blog.data.model.ModelCompare
import com.hanphone.blog.data.model.ModelLeaderboard
import com.hanphone.blog.data.model.PageResult
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.TokenRefresh
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.Vendor
import kotlin.jvm.JvmSuppressWildcards
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface BlogApi {

    // ===== 博客 =====
    @GET("blogs")
    suspend fun blogs(
        @Query("pagenum") page: Int,
        @Query("pagesize") size: Int
    ): ApiResult<PageResult<Blog>>

    @GET("blog/{id}")
    suspend fun blog(@Path("id") id: Long): ApiResult<Blog>

    /** /types/{id} 走 Spring Pageable（page 为 0 起始） */
    @GET("types/{id}")
    suspend fun blogsByType(
        @Path("id") id: Long,
        @Query("page") page: Int,
        @Query("size") size: Int
    ): ApiResult<PageResult<Blog>>

    /** /tags/{id} 走 Spring Pageable（page 为 0 起始） */
    @GET("tags/{id}")
    suspend fun blogsByTag(
        @Path("id") id: Long,
        @Query("page") page: Int,
        @Query("size") size: Int
    ): ApiResult<PageResult<Blog>>

    @GET("getFullTypeList")
    suspend fun fullTypeList(): ApiResult<List<Type>>

    @GET("getFullTagList")
    suspend fun fullTagList(): ApiResult<List<Tag>>

    @GET("archiveBlog")
    suspend fun archiveBlog(): ApiResult<Map<String, List<Blog>>>

    @GET("site-stats")
    suspend fun siteStats(): ApiResult<SiteStats>

    @GET("visit-count")
    suspend fun visitCount(): ApiResult<Long>

    @GET("friendLinks")
    suspend fun friendLinks(): ApiResult<List<FriendLink>>

    /** 前台申请友链（免登录，@Idempotent 需 X-Request-Id；带 applyText 时后端不强制 name/url） */
    @POST("friendLinks/apply")
    suspend fun applyFriendLink(
        @Header("X-Request-Id") requestId: String?,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): ApiResult<FriendLink>

    @GET("search")
    suspend fun search(
        @Query("query") query: String,
        @Query("limit") limit: Int = 20
    ): ApiResult<List<SearchResultItem>>

    // ===== 项目 =====
    /** 全部公开项目（type 查询可选，App 端一次拉全、前端按 type 分组筛选，与 web ProjectClient 一致） */
    @GET("projects")
    suspend fun projects(@Query("type") type: Int? = null): ApiResult<List<Project>>

    // ===== 文库 =====
    @GET("docs")
    suspend fun docs(): ApiResult<List<Doc>>

    /** 打开文件时上报浏览量（后端自增，无需 body） */
    @POST("docs/{docId}/view")
    suspend fun incrementDocView(@Path("docId") docId: String): ApiResult<Any?>

    // ===== 评论 / 点赞（@Idempotent 接口需携带 X-Request-Id）=====
    @GET("comments/{blogId}")
    suspend fun comments(@Path("blogId") blogId: Long): ApiResult<List<Comment>>

    @POST("comments")
    suspend fun postComment(
        @Header("X-Request-Id") requestId: String?,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): ApiResult<Comment>

    @POST("blog/{id}/like")
    suspend fun likeBlog(
        @Path("id") id: Long,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): ApiResult<Any?>

    // ===== 随笔 =====
    @GET("essays")
    suspend fun essays(
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int
    ): ApiResult<PageResult<Essay>>

    @GET("essays/{id}")
    suspend fun essay(@Path("id") id: Long): ApiResult<Essay>

    @GET("essays/{id}/comments")
    suspend fun essayComments(@Path("id") id: Long): ApiResult<List<EssayComment>>

    @POST("essays/{id}/like")
    suspend fun likeEssay(
        @Path("id") id: Long,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): ApiResult<Any?>

    /** 随笔评论需要登录（body 含 userId），@Idempotent 需 X-Request-Id */
    @POST("essays/{id}/comments")
    suspend fun postEssayComment(
        @Path("id") id: Long,
        @Header("X-Request-Id") requestId: String?,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): ApiResult<EssayComment>

    // ===== 登录 =====
    @POST("login")
    suspend fun login(@Body body: Map<String, String>): ApiResult<LoginData>

    /** 第三方登录：用回跳拿到的一次性 code 换会话（公开接口，返回结构与 /login 一致） */
    @POST("oauth/app/exchange")
    suspend fun exchangeOAuthCode(@Body body: Map<String, String>): ApiResult<LoginData>

    // ===== 长期登录：refresh / logout =====
    /** 用 refresh 换新 access（轮换），失败返回 flag=false */
    @POST("auth/refresh")
    suspend fun refreshTokens(@Body body: Map<String, String>): ApiResult<TokenRefresh>

    @POST("auth/logout")
    suspend fun logout(@Body body: Map<String, String>): ApiResult<Any?>

    // ===== 注册（邮箱验证码）=====
    @POST("user/sendCaptcha")
    suspend fun sendCaptcha(@Body body: Map<String, String>): ApiResult<Any?>

    /** 忘记密码：邮箱验证码重置（newPassword 由仓库层做 md5） */
    @POST("user/resetPassword")
    suspend fun resetPassword(@Body body: Map<String, String>): ApiResult<Any?>

    @POST("register")
    suspend fun register(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<LoginData>

    // ===== 聊天（hanphone-chat，绝对路径 + Bearer 鉴权）=====
    // limit：最近 N 条历史（服务端 1~500，默认 200），见 hanphone-chat docs/android-protocol.md
    @GET("https://hanphone.cn/chat-api/api/messages/admin")
    suspend fun adminMessages(
        @Header("Authorization") auth: String?,
        @Query("limit") limit: Int = 200
    ): ChatMessagesResponse

    @GET("https://hanphone.cn/chat-api/api/users/all")
    suspend fun chatUsers(@Header("Authorization") auth: String?): ChatUsersResponse

    // 管理员收件箱未读数
    @GET("https://hanphone.cn/chat-api/api/users/unread")
    suspend fun chatUnread(@Header("Authorization") auth: String?): ChatUnreadResponse

    // 博主（管理员）资料：普通用户私信页展示昵称/头像
    @GET("https://hanphone.cn/chat-api/api/user/admin")
    suspend fun chatAdmin(@Header("Authorization") auth: String?): ChatAdminResponse

    @GET("https://hanphone.cn/chat-api/api/messages/{userId}")
    suspend fun chatMessagesWithUser(
        @Path("userId") userId: Long,
        @Header("Authorization") auth: String?,
        @Query("limit") limit: Int = 200
    ): ChatMessagesResponse

    // ===== FCM 设备令牌（hanphone-chat，带 Bearer 时关联用户 = 收私信推送；匿名 = 仅收热点推送）=====
    @POST("https://hanphone.cn/chat-api/api/devices")
    suspend fun registerDevice(
        @Header("Authorization") auth: String?,
        @Body body: DeviceTokenBody
    ): DeviceAck

    @POST("https://hanphone.cn/chat-api/api/devices/remove")
    suspend fun removeDevice(
        @Header("Authorization") auth: String?,
        @Body body: DeviceTokenBody
    ): DeviceAck

    // ===== FCM 设备令牌（博客 server：直接发「热点更新」推送；Token 头由拦截器注入以关联用户）=====
    @POST("devices")
    suspend fun registerBlogDevice(@Body body: DeviceTokenBody): DeviceAck

    @POST("devices/remove")
    suspend fun removeBlogDevice(@Body body: DeviceTokenBody): DeviceAck

    // ===== 用户信息（我的页展示/编辑；Token 头由拦截器注入）=====
    @POST("user/current")
    suspend fun currentUser(@Body body: Map<String, Long>): ApiResult<User>

    /** body: { userId, user: { nickname?, avatar? } }；后端只更新非空字段 */
    @POST("user/current/update")
    suspend fun updateCurrentUser(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<User>

    // ===== 留言板 =====
    @GET("messages")
    suspend fun messages(): ApiResult<List<Message>>

    @POST("messages")
    suspend fun postMessage(
        @Header("X-Request-Id") requestId: String?,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): ApiResult<Message>

    // ===== 站内通知（均需登录；Token 头由拦截器注入）=====
    /** page 1 起始；返回 items + 当前全量未读数 */
    @GET("notifications")
    suspend fun notifications(
        @Query("page") page: Int,
        @Query("size") size: Int = 20
    ): ApiResult<NotificationPage>

    @GET("notifications/unread-count")
    suspend fun notificationUnreadCount(): ApiResult<UnreadCount>

    /** 单条标记已读（校验归属；非本人 403） */
    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Long): ApiResult<Any?>

    /** 全部标记已读，data = 更新条数 */
    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResult<Int>

    // ===== 收藏（均需登录；type = BLOG / ESSAY / DOC）=====
    @GET("bookmarks")
    suspend fun bookmarks(@Query("type") type: String? = null): ApiResult<List<BookmarkItem>>

    @GET("bookmarks/status")
    suspend fun bookmarkStatus(
        @Query("type") type: String,
        @Query("key") key: String
    ): ApiResult<BookmarkStatus>

    @POST("bookmarks")
    suspend fun addBookmark(@Body body: Map<String, String>): ApiResult<BookmarkStatus>

    /** 取消收藏（幂等；不存在也返回成功） */
    @DELETE("bookmarks/{type}/{key}")
    suspend fun removeBookmark(
        @Path("type") type: String,
        @Path("key") key: String
    ): ApiResult<BookmarkStatus>

    // ===== 热点聚合（洞察 /hot/*，公开只读）=====
    @GET("hot/overview")
    suspend fun hotOverview(): ApiResult<HotOverview>

    /** category: github / hf / ai-news；为 null 时返回全部 */
    @GET("hot/feed")
    suspend fun hotFeed(
        @Query("category") category: String?,
        @Query("limit") limit: Int = 30
    ): ApiResult<List<HotFeedItem>>

    @GET("hot/sources")
    suspend fun hotSources(): ApiResult<List<HotSourceStatus>>

    @GET("hot/leaderboards")
    suspend fun hotLeaderboard(
        @Query("modality") modality: String,
        @Query("normalized") normalized: Boolean = true
    ): ApiResult<ModelLeaderboard>

    @GET("hot/benchmarks")
    suspend fun hotBenchmarks(): ApiResult<List<BenchmarkMeta>>

    /** 搜索任意模型（厂商/名称包含匹配） */
    @GET("hot/models")
    suspend fun hotModels(
        @Query("q") q: String?,
        @Query("vendor") vendor: String?,
        @Query("sort") sort: String,
        @Query("limit") limit: Int = 30,
        @Query("normalized") normalized: Boolean = true
    ): ApiResult<List<ModelBenchmarkRow>>

    /** 归一后的厂商列表（对比页「按公司」，重点厂商置顶） */
    @GET("hot/vendors")
    suspend fun hotVendors(@Query("normalized") normalized: Boolean = true): ApiResult<List<Vendor>>

    /** keys 重复查询参数（Spring @RequestParam List<String> 解析） */
    @GET("hot/models/compare")
    suspend fun hotCompare(
        @Query("keys") keys: List<String>,
        @Query("normalized") normalized: Boolean = true
    ): ApiResult<ModelCompare>

    @GET("hot/leaderboards/trend")
    suspend fun hotLeaderboardTrend(
        @Query("modality") modality: String,
        @Query("days") days: Int = 30,
        @Query("top") top: Int = 5
    ): ApiResult<LeaderboardTrend>
}