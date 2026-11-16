package com.hanphone.blog.data.api

import com.squareup.moshi.Json
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Query

/**
 * 后台文件服务（admin-file，独立域名 https://hanphone.top/）。
 *
 * 与 [FileApi]（公共头像上传）分开：**这里的接口必须带博客 JWT**。
 * admin-file 用同一套 SECRET_KEY 校验 token（payload 里也有 userId/userType），
 * 所以 App 现有的登录 token 直接可用。
 *
 * 注意：不要把 Token 加到全局 fileApi 拦截器上——`/upload/avatar` 是公共接口，
 * 没必要把用户凭证带过去。
 */
interface AdminFileApi {

    /** 单文件上传（封面图等），返回 url / width / height / thumbPath */
    @Multipart
    @POST("upload")
    suspend fun upload(
        @Header("Token") token: String?,
        @Part file: MultipartBody.Part,
        @Query("namespace") namespace: String
    ): UploadFileResult

    /** 批量上传（随笔附件，最多 20 个） */
    @Multipart
    @POST("upload/batch")
    suspend fun uploadBatch(
        @Header("Token") token: String?,
        @Part files: List<MultipartBody.Part>,
        @Query("namespace") namespace: String
    ): UploadBatchResult

    /** 删除本站物理文件（未入库就移除的附件）；缩略图/HLS 派生资源由服务端级联回收 */
    @DELETE("delete")
    suspend fun delete(
        @Header("Token") token: String?,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): SimpleFileResult
}

data class UploadFileResult(
    val code: Int = 0,
    val message: String = "",
    val url: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    val thumbPath: String? = null,
    val mimetype: String? = null
)

data class UploadBatchResult(
    val code: Int = 0,
    val message: String = "",
    val total: Int = 0,
    val success: Int = 0,
    val failed: Int = 0,
    val results: List<UploadBatchItem> = emptyList()
)

data class UploadBatchItem(
    val success: Boolean = false,
    val url: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    val thumbPath: String? = null,
    val mimetype: String? = null,
    @Json(name = "originalName") val originalName: String? = null,
    val error: String? = null
)

data class SimpleFileResult(
    val code: Int = 0,
    val message: String = "",
    val error: String? = null
)
