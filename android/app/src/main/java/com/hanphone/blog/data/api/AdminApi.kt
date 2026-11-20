package com.hanphone.blog.data.api

import com.hanphone.blog.data.model.AdminCollectRunsPage
import com.hanphone.blog.data.model.AdminRebuildSummary
import com.hanphone.blog.data.model.AdminSummarySettings
import com.hanphone.blog.data.model.AdminTypeStat
import com.hanphone.blog.data.model.AdminVisitorArea
import com.hanphone.blog.data.model.AdminVisitorOverview
import com.hanphone.blog.data.model.AdminVisitorPage
import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.PageResult
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.TagBlogCount
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.User
import kotlin.jvm.JvmSuppressWildcards
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * 后台管理接口（admin/ 路径）。
 *
 * 鉴权：后端 TokenInterceptor 校验 token 里的 `userType=1`，App 的 OkHttp 拦截器
 * 已自动注入 `Token` 头，因此这里不需要额外参数。
 *
 * 请求体统一用 Map：后端多数接口是 `{ <key>: {...} }` 包一层的 Map<String, X>，
 * 用强类型 data class 反而要为每个包裹再定义一个类。
 */
interface AdminApi {

    // ===== 概览 =====
    @GET("admin/getBlogCount")
    suspend fun blogCount(): ApiResult<Long>

    @GET("admin/getViewCount")
    suspend fun viewCount(): ApiResult<Long>

    @GET("admin/getCommentCount")
    suspend fun commentCount(): ApiResult<Long>

    @GET("admin/getBlogLikes")
    suspend fun likeCount(): ApiResult<Long>

    /** 月度数据每项形如 "2024-01,12"（网页按逗号切分），见 AdminMonthly */
    @GET("admin/getViewCountByMonth")
    suspend fun viewsByMonth(): ApiResult<List<String>>

    /** 站点访问量（按 visit 记录统计，与「阅读量」不同口径） */
    @GET("admin/getVisitCountByMonth")
    suspend fun visitsByMonth(): ApiResult<List<String>>

    @GET("admin/getBlogCountByMonth")
    suspend fun blogsByMonth(): ApiResult<List<String>>

    @GET("admin/getCommentCountByMonth")
    suspend fun commentsByMonth(): ApiResult<List<String>>

    @GET("admin/getLikesByMonth")
    suspend fun likesByMonth(): ApiResult<List<String>>

    /** 与 [fullTypes] 同接口，但额外带上 blogs（仅取 id 用于统计分类分布） */
    @GET("admin/getFullTypeList")
    suspend fun typeStats(): ApiResult<List<AdminTypeStat>>

    // ===== 访客统计 =====
    @GET("admin/visitor/overview")
    suspend fun visitorOverview(): ApiResult<AdminVisitorOverview>

    @GET("admin/visitor/area-list")
    suspend fun visitorAreas(): ApiResult<List<AdminVisitorArea>>

    @GET("admin/visitor/ip-list")
    suspend fun visitorIps(
        @Query("keyword") keyword: String?,
        @Query("sortBy") sortBy: String,
        @Query("order") order: String,
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int
    ): ApiResult<AdminVisitorPage>

    @POST("admin/visitor/clear")
    suspend fun clearVisitors(): ApiResult<Any?>

    // ===== 评论 =====
    /** 不传分页参数时后端返回全部（最多 200 条） */
    @GET("admin/getCommentList")
    suspend fun commentList(): ApiResult<List<Comment>>

    @DELETE("comments/{id}")
    suspend fun deleteComment(@Path("id") id: Long): ApiResult<Any?>

    // ===== 随笔 =====
    @GET("admin/essays")
    suspend fun essays(
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int
    ): ApiResult<PageResult<Essay>>

    @POST("admin/essay")
    suspend fun saveEssay(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Essay>

    @POST("admin/essays/recommend")
    suspend fun recommendEssay(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @POST("admin/essays/published")
    suspend fun publishEssay(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @DELETE("admin/essay/{id}")
    suspend fun deleteEssay(
        @Path("id") id: Long,
        @Query("syncDeleteImage") syncDeleteImage: Boolean = true
    ): ApiResult<Any?>

    // ===== 博客 =====
    @POST("admin/getBlogList")
    suspend fun blogs(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<PageResult<Blog>>

    /** 新增/修改；发布状态切换也走这里（整篇回传，见 AdminRepository.toggleBlogPublished） */
    @POST("admin/blogs")
    suspend fun saveBlog(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @POST("admin/blogs/recommend")
    suspend fun recommendBlog(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @DELETE("admin/blogs/{id}")
    suspend fun deleteBlog(
        @Path("id") id: Long,
        @Query("syncDeleteImage") syncDeleteImage: Boolean = true
    ): ApiResult<Any?>

    // ===== 标签 / 分类 =====
    @GET("admin/getFullTagListAndBlogNumber")
    suspend fun tagsWithCount(): ApiResult<List<TagBlogCount>>

    @GET("admin/getFullTagList")
    suspend fun fullTags(): ApiResult<List<Tag>>

    @POST("admin/tags")
    suspend fun saveTag(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Tag>

    @DELETE("admin/tags/{id}")
    suspend fun deleteTag(@Path("id") id: Long): ApiResult<Any?>

    @GET("admin/getFullTypeList")
    suspend fun fullTypes(): ApiResult<List<Type>>

    @POST("admin/types")
    suspend fun saveType(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Type>

    @DELETE("admin/types/{id}")
    suspend fun deleteType(
        @Path("id") id: Long,
        @Query("syncDeleteImage") syncDeleteImage: Boolean = true
    ): ApiResult<Any?>

    // ===== 友链 =====
    @GET("admin/friendLinks")
    suspend fun friendLinks(): ApiResult<List<FriendLink>>

    @POST("admin/friendLink")
    suspend fun saveFriendLink(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @DELETE("admin/friendLink/{id}")
    suspend fun deleteFriendLink(@Path("id") id: Long): ApiResult<Any?>

    @POST("admin/friendLinks/recommend")
    suspend fun recommendFriendLink(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @POST("admin/friendLinks/published")
    suspend fun publishFriendLink(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    // ===== 项目 =====
    @GET("admin/projects")
    suspend fun projects(): ApiResult<List<Project>>

    @POST("admin/project")
    suspend fun saveProject(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @DELETE("admin/project/{id}")
    suspend fun deleteProject(
        @Path("id") id: Long,
        @Query("syncDeleteImage") syncDeleteImage: Boolean = true
    ): ApiResult<Any?>

    @POST("admin/projects/recommend")
    suspend fun recommendProject(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @POST("admin/projects/published")
    suspend fun publishProject(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    // ===== 文库 =====
    @GET("admin/docs")
    suspend fun docs(): ApiResult<List<Doc>>

    @POST("admin/doc")
    suspend fun saveDoc(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @DELETE("admin/doc/{id}")
    suspend fun deleteDoc(@Path("id") id: Long): ApiResult<Any?>

    @POST("admin/docs/recommend")
    suspend fun recommendDoc(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    @POST("admin/docs/published")
    suspend fun publishDoc(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<Any?>

    // ===== 用户管理 =====
    @GET("admin/users")
    suspend fun users(): ApiResult<List<User>>

    /**
     * 修改用户（POST /admin/user）。后端 `{ "user": {...} }` 包一层，且按 null 忽略字段，
     * 所以只传要改的键即可（改密码时 password 传 md5，但 App 走 [resetUserPassword]）。
     */
    @POST("admin/user")
    suspend fun saveUser(@Body body: Map<String, @JvmSuppressWildcards Any?>): ApiResult<User>

    /** 重置密码：newPassword 必须是 md5(明文)（后端再 bcrypt，与网页后台一致） */
    @POST("admin/user/resetPassword")
    suspend fun resetUserPassword(@Body body: Map<String, String>): ApiResult<Any?>

    @DELETE("admin/users/{id}")
    suspend fun deleteUser(@Path("id") id: Long): ApiResult<Any?>

    // ===== 聚合数据 =====
    @POST("admin/hot/collect")
    suspend fun collectHot(): ApiResult<Map<String, Any?>>

    @GET("admin/hot/status")
    suspend fun hotStatus(): ApiResult<Map<String, Any?>>

    @GET("admin/hot/sources")
    suspend fun hotSources(): ApiResult<List<HotSourceStatus>>

    @GET("admin/hot/runs/page")
    suspend fun hotRuns(
        @Query("page") page: Int,
        @Query("size") size: Int,
        @Query("triggerType") triggerType: String?,
        @Query("result") result: String?,
        @Query("q") q: String?,
        @Query("from") from: String?,
        @Query("to") to: String?,
        @Query("order") order: String
    ): ApiResult<AdminCollectRunsPage>

    @POST("admin/hot/models/rebuild-normalization")
    suspend fun rebuildNormalization(@Query("dryRun") dryRun: Boolean): ApiResult<AdminRebuildSummary>

    @GET("admin/hot/settings/summary")
    suspend fun summarySettings(): ApiResult<AdminSummarySettings>

    @PUT("admin/hot/settings/summary")
    suspend fun saveSummarySettings(@Body body: Map<String, String>): ApiResult<AdminSummarySettings>

    @POST("admin/hot/settings/summary/test")
    suspend fun testSummary(): ApiResult<String>
}
