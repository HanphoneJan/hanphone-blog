package com.hanphone.blog.data.repo

import com.hanphone.blog.data.api.AdminApi
import com.hanphone.blog.data.api.AdminFileApi
import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.api.UploadBatchItem
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.AdminMonthly
import com.hanphone.blog.data.model.AdminStats
import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayFileUrl
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.PageResult
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.TagBlogCount
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

/**
 * 后台管理仓库。
 *
 * 约定：
 * - 所有接口都在 `/admin/` 路径下，Token 由 OkHttp 拦截器注入，后端按 token 内 `userType=1` 放行。
 * - 请求体沿用后端的「包一层」结构（`{ blog: {...} }` / `{ essay: {...} }`），用 Map 构造。
 * - 网络异常不在这里吞掉：ViewModel 统一 try/catch 后提示（HANDOVER 规矩 4）。
 */
class AdminRepository(
    private val api: AdminApi = ApiClient.adminApi,
    private val fileApi: AdminFileApi = ApiClient.adminFileApi
) {

    // ===== 概览 =====
    suspend fun stats(): AdminStats = withContext(Dispatchers.IO) {
        AdminStats(
            blogCount = api.blogCount().data ?: 0L,
            viewCount = api.viewCount().data ?: 0L,
            commentCount = api.commentCount().data ?: 0L,
            likeCount = api.likeCount().data ?: 0L
        )
    }

    /** kind: views / blogs / comments / likes，对齐后台「阅读量/发表数/评论数/点赞数」四个图表 */
    suspend fun monthly(kind: String): List<AdminMonthly> = withContext(Dispatchers.IO) {
        val raw = when (kind) {
            "blogs" -> api.blogsByMonth()
            "comments" -> api.commentsByMonth()
            "likes" -> api.likesByMonth()
            else -> api.viewsByMonth()
        }.data.orEmpty()
        raw.mapNotNull { item ->
            val parts = item.split(',')
            if (parts.size < 2) return@mapNotNull null
            AdminMonthly(parts[0].trim(), parts[1].trim().toDoubleOrNull()?.toLong() ?: 0L)
        }
    }

    // ===== 评论 =====
    suspend fun comments(): ApiResult<List<Comment>> =
        withContext(Dispatchers.IO) { api.commentList() }

    suspend fun deleteComment(id: Long): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.deleteComment(id) }

    // ===== 随笔 =====
    suspend fun essays(page: Int, pageSize: Int = 10): ApiResult<PageResult<Essay>> =
        withContext(Dispatchers.IO) { api.essays(page, pageSize) }

    /**
     * 新建 / 修改随笔。
     *
     * 后端只读取 title / content / user_id / id / essayFileUrls，**不读取 published / recommend**：
     * - 新建后默认未发布，需要再调 [publishEssay]（与网页版一致）
     * - 修改不会动发布状态（正是我们要的）
     */
    suspend fun saveEssay(
        id: Long?,
        title: String,
        content: String,
        userId: Long,
        files: List<EssayFileUrl>
    ): ApiResult<Essay> = withContext(Dispatchers.IO) {
        val essay = mutableMapOf<String, Any?>(
            "title" to title,
            "content" to content,
            "user_id" to userId,
            "essayFileUrls" to files.map { f ->
                mapOf(
                    "url" to f.url,
                    "urlType" to (f.urlType ?: "OTHER"),
                    "width" to f.width,
                    "height" to f.height,
                    "thumbPath" to f.thumbPath
                )
            }
        )
        if (id != null) essay["id"] = id
        api.saveEssay(mapOf("essay" to essay))
    }

    suspend fun publishEssay(id: Long, published: Boolean): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.publishEssay(mapOf("essayId" to id, "published" to published)) }

    suspend fun recommendEssay(id: Long, recommend: Boolean): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.recommendEssay(mapOf("essayId" to id, "recommend" to recommend)) }

    suspend fun deleteEssay(id: Long, syncDeleteImage: Boolean = true): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.deleteEssay(id, syncDeleteImage) }

    // ===== 博客 =====
    suspend fun blogs(page: Int, pageSize: Int = 10, title: String = ""): ApiResult<PageResult<Blog>> =
        withContext(Dispatchers.IO) {
            api.blogs(
                mapOf(
                    "pagenum" to page,
                    "pagesize" to pageSize,
                    "title" to title.ifBlank { null }
                )
            )
        }

    /**
     * 博客的 payload。
     *
     * 注意（后端 `updateBlog` 用「忽略 null 复制」，但 boolean 是原始类型）：
     * `published / recommend / commentabled / shareStatement` 必须回传现值，
     * 否则会被缺省的 false 覆盖；`tags` 也必须回传完整列表，否则会被清空。
     */
    private fun blogPayload(blog: Blog): Map<String, Any?> = mapOf(
        "id" to blog.id,
        "title" to blog.title,
        "content" to blog.content,
        "description" to blog.description,
        "firstPicture" to blog.firstPicture,
        "flag" to blog.flag,
        "commentabled" to blog.commentabled,
        "shareStatement" to blog.shareStatement,
        "published" to blog.published,
        "recommend" to blog.recommend,
        "type" to blog.type?.let { mapOf("id" to it.id) },
        "tags" to blog.tags.map { mapOf("id" to it.id) },
        "user" to blog.user?.let { mapOf("id" to it.id) }
    )

    suspend fun saveBlog(blog: Blog): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.saveBlog(mapOf("blog" to blogPayload(blog))) }

    /** 新建博客：没有 id 字段，后端才会走 saveBlog 分支（带 id=0 会被当成「博客不存在」） */
    suspend fun createBlog(blog: Blog): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.saveBlog(mapOf("blog" to (blogPayload(blog) - "id"))) }

    suspend fun saveBlog(body: Map<String, Any?>): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.saveBlog(mapOf("blog" to body)) }

    suspend fun toggleBlogPublished(blog: Blog): ApiResult<Void?> =
        saveBlog(blog.copy(published = !blog.published))

    suspend fun toggleBlogRecommend(blog: Blog): ApiResult<Void?> =
        withContext(Dispatchers.IO) {
            api.recommendBlog(mapOf("blogId" to blog.id, "recommend" to !blog.recommend))
        }

    suspend fun deleteBlog(id: Long, syncDeleteImage: Boolean = true): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.deleteBlog(id, syncDeleteImage) }

    // ===== 标签 / 分类 =====
    suspend fun tagsWithCount(): ApiResult<List<TagBlogCount>> =
        withContext(Dispatchers.IO) { api.tagsWithCount() }

    suspend fun fullTags(): ApiResult<List<Tag>> = withContext(Dispatchers.IO) { api.fullTags() }

    suspend fun saveTag(id: Long?, name: String): ApiResult<Tag> = withContext(Dispatchers.IO) {
        val tag = mutableMapOf<String, Any?>("name" to name)
        if (id != null) tag["id"] = id
        api.saveTag(mapOf("tag" to tag))
    }

    suspend fun deleteTag(id: Long): ApiResult<Void?> = withContext(Dispatchers.IO) { api.deleteTag(id) }

    suspend fun fullTypes(): ApiResult<List<Type>> = withContext(Dispatchers.IO) { api.fullTypes() }

    suspend fun saveType(id: Long?, name: String, picUrl: String?): ApiResult<Type> =
        withContext(Dispatchers.IO) {
            val type = mutableMapOf<String, Any?>("name" to name, "pic_url" to picUrl)
            if (id != null) type["id"] = id
            api.saveType(mapOf("type" to type))
        }

    suspend fun deleteType(id: Long, syncDeleteImage: Boolean = true): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.deleteType(id, syncDeleteImage) }

    // ===== 友链 =====
    suspend fun friendLinks(): ApiResult<List<FriendLink>> =
        withContext(Dispatchers.IO) { api.friendLinks() }

    suspend fun saveFriendLink(link: FriendLink): ApiResult<Void?> = withContext(Dispatchers.IO) {
        // 后端同时有 url / linkUrl 两个字段：网页申请入口写 linkUrl，后台表单写 url。
        // 两个都回传，避免某一侧读不到。
        api.saveFriendLink(
            mapOf(
                "friendLink" to mapOf(
                    "id" to link.id,
                    "type" to link.type,
                    "name" to link.name,
                    "description" to link.description,
                    "url" to link.url,
                    "linkUrl" to (link.linkUrl ?: link.url),
                    "avatar" to link.avatar,
                    "color" to link.color,
                    "siteshot" to link.siteshot,
                    "rss" to link.rss,
                    "nickname" to link.nickname,
                    "recommend" to link.recommend,
                    "published" to link.published
                )
            )
        )
    }

    suspend fun deleteFriendLink(id: Long): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.deleteFriendLink(id) }

    suspend fun toggleFriendLinkRecommend(link: FriendLink): ApiResult<Void?> =
        withContext(Dispatchers.IO) {
            api.recommendFriendLink(mapOf("friendLinkId" to link.id, "recommend" to !link.recommend))
        }

    suspend fun toggleFriendLinkPublished(link: FriendLink): ApiResult<Void?> =
        withContext(Dispatchers.IO) {
            api.publishFriendLink(mapOf("friendLinkId" to link.id, "published" to (link.published != true)))
        }

    // ===== 项目 =====
    suspend fun projects(): ApiResult<List<Project>> = withContext(Dispatchers.IO) { api.projects() }

    suspend fun saveProject(project: Project): ApiResult<Void?> = withContext(Dispatchers.IO) {
        api.saveProject(
            mapOf(
                "project" to mapOf(
                    "id" to project.id,
                    "title" to project.title,
                    "content" to project.content,
                    "pic_url" to project.picUrl,
                    "url" to project.url,
                    "techs" to project.techs,
                    "type" to project.type,
                    "recommend" to project.recommend,
                    "published" to project.published
                )
            )
        )
    }

    suspend fun deleteProject(id: Long, syncDeleteImage: Boolean = true): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.deleteProject(id, syncDeleteImage) }

    suspend fun toggleProjectRecommend(project: Project): ApiResult<Void?> =
        withContext(Dispatchers.IO) {
            api.recommendProject(mapOf("projectId" to project.id, "recommend" to !project.recommend))
        }

    suspend fun toggleProjectPublished(project: Project): ApiResult<Void?> =
        withContext(Dispatchers.IO) {
            api.publishProject(mapOf("projectId" to project.id, "published" to (project.published != true)))
        }

    // ===== 文库 =====
    suspend fun docs(): ApiResult<List<Doc>> = withContext(Dispatchers.IO) { api.docs() }

    suspend fun saveDoc(doc: Map<String, Any?>): ApiResult<Void?> =
        withContext(Dispatchers.IO) { api.saveDoc(mapOf("doc" to doc)) }

    suspend fun deleteDoc(id: Long): ApiResult<Void?> = withContext(Dispatchers.IO) { api.deleteDoc(id) }

    suspend fun toggleDocRecommend(doc: Doc): ApiResult<Void?> = withContext(Dispatchers.IO) {
        api.recommendDoc(mapOf("docId" to doc.id, "recommend" to !doc.recommend))
    }

    suspend fun toggleDocPublished(doc: Doc): ApiResult<Void?> = withContext(Dispatchers.IO) {
        api.publishDoc(mapOf("docId" to doc.id, "published" to (doc.published != true)))
    }

    // ===== 用户 =====
    suspend fun users(): ApiResult<List<User>> = withContext(Dispatchers.IO) { api.users() }

    // ===== 聚合数据 =====
    suspend fun collectHot(): ApiResult<Map<String, Any?>> =
        withContext(Dispatchers.IO) { api.collectHot() }

    suspend fun hotStatus(): ApiResult<Map<String, Any?>> =
        withContext(Dispatchers.IO) { api.hotStatus() }

    // ===== 文件上传（admin-file）=====
    /**
     * 单个文件上传，返回 url / width / height / thumbPath。
     * namespace 形如 `blog/essay/{标题}` 或 `blog/blogs`。
     */
    suspend fun uploadFile(file: File, namespace: String, mimeType: String): UploadBatchItem =
        withContext(Dispatchers.IO) {
            val part = MultipartBody.Part.createFormData(
                "file",
                file.name,
                file.asRequestBody(mimeType.toMediaType())
            )
            val res = fileApi.upload(TokenStore.token.value, part, namespace)
            if (res.url == null) {
                UploadBatchItem(success = false, error = res.message.ifBlank { "上传失败" })
            } else {
                UploadBatchItem(
                    success = true,
                    url = res.url,
                    width = res.width,
                    height = res.height,
                    thumbPath = res.thumbPath,
                    mimetype = res.mimetype,
                    originalName = file.name
                )
            }
        }

    /** 批量上传（≤20 个），返回与输入顺序一致的条目；失败的项 success=false */
    suspend fun uploadBatch(files: List<Pair<File, String>>, namespace: String): List<UploadBatchItem> =
        withContext(Dispatchers.IO) {
            if (files.isEmpty()) return@withContext emptyList()
            val parts = files.map { (file, mime) ->
                MultipartBody.Part.createFormData(
                    "files",
                    file.name,
                    file.asRequestBody(mime.toMediaType())
                )
            }
            val res = fileApi.uploadBatch(TokenStore.token.value, parts, namespace)
            res.results
        }

    /** 删除刚上传但未入库的物理文件（http 404 会被 Retrofit 抛异常，调用方 try/catch 忽略即可） */
    suspend fun deleteUploadedFile(url: String) = withContext(Dispatchers.IO) {
        val parsed = parseFileUrl(url) ?: return@withContext
        fileApi.delete(
            TokenStore.token.value,
            mapOf(
                "name" to parsed.second,
                "namespace" to parsed.first,
                "isDirectory" to false
            )
        )
    }

    /** `https://hanphone.top/blog/essay/xx/a.jpg` → ("blog/essay/xx", "a.jpg") */
    private fun parseFileUrl(url: String): Pair<String, String>? {
        val path = url.substringAfter("hanphone.top/", "").trim('/')
        if (path.isEmpty()) return null
        val idx = path.lastIndexOf('/')
        if (idx <= 0) return null
        return path.substring(0, idx) to path.substring(idx + 1)
    }
}
