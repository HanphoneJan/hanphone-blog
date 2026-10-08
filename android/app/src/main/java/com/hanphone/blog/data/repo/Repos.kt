package com.hanphone.blog.data.repo

import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.api.BlogApi
import com.hanphone.blog.data.api.FileApi
import com.hanphone.blog.data.api.UploadAvatarResult
import com.hanphone.blog.data.chat.ChatMessagesResponse
import com.hanphone.blog.data.chat.ChatUnreadResponse
import com.hanphone.blog.data.chat.ChatUsersResponse
import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.data.model.BenchmarkMeta
import com.hanphone.blog.data.model.Blog
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
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.model.Vendor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

private const val PAGE_SIZE = 10

/** 博客 + 站点元信息 */
class BlogRepository(private val api: BlogApi = ApiClient.api) {

    suspend fun blogs(page: Int = 1, size: Int = PAGE_SIZE): ApiResult<PageResult<Blog>> =
        withContext(Dispatchers.IO) { api.blogs(page, size) }

    suspend fun blog(id: Long): ApiResult<Blog> =
        withContext(Dispatchers.IO) { api.blog(id) }

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

    suspend fun search(query: String, limit: Int = 20): ApiResult<List<SearchResultItem>> =
        withContext(Dispatchers.IO) { api.search(query, limit) }

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

    suspend fun likeBlog(blogId: Long, userId: Long, isLike: Boolean): ApiResult<Void?> =
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

    suspend fun login(username: String, password: String): ApiResult<LoginData> =
        withContext(Dispatchers.IO) {
            api.login(mapOf("username" to username, "password" to password))
        }

    suspend fun sendRegisterCaptcha(email: String): ApiResult<Void?> =
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
    suspend fun sendGeneralCaptcha(email: String): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.sendCaptcha(mapOf("email" to email)) }

    /** 私信：拉取与管理员的历史记录（需 Bearer token） */
    suspend fun adminMessages(token: String): ChatMessagesResponse =
        withContext(Dispatchers.IO) { api.adminMessages("Bearer $token") }

    /** 管理员：全部用户列表 */
    suspend fun chatUsers(token: String): ChatUsersResponse =
        withContext(Dispatchers.IO) { api.chatUsers("Bearer $token") }

    /** 管理员：收件箱未读数 */
    suspend fun chatUnread(token: String): ChatUnreadResponse =
        withContext(Dispatchers.IO) { api.chatUnread("Bearer $token") }

    /** 管理员：与指定用户的历史记录 */
    suspend fun chatMessagesWithUser(token: String, userId: Long): ChatMessagesResponse =
        withContext(Dispatchers.IO) { api.chatMessagesWithUser(userId, "Bearer $token") }

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
                "password" to password,
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

    suspend fun likeEssay(essayId: Long, userId: Long, isLike: Boolean): ApiResult<Void?> =
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

/** 文件服务（admin-file 上传） */
class FileRepository(private val api: FileApi = ApiClient.fileApi) {

    suspend fun uploadAvatar(file: File): UploadAvatarResult = withContext(Dispatchers.IO) {
        val mediaType = "image/*".toMediaType()
        val body = file.asRequestBody(mediaType)
        val part = MultipartBody.Part.createFormData("avatar", file.name, body)
        api.uploadAvatar(part)
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