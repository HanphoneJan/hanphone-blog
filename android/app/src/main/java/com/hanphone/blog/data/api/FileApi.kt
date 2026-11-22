package com.hanphone.blog.data.api

import com.squareup.moshi.Json
import okhttp3.MultipartBody
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

/**
 * 文件服务（admin-file，独立域名 https://hanphone.top/，无 /api 前缀）。
 */
interface FileApi {

    /** 公共头像上传（无需鉴权，≤5MB，每 IP 每小时限次） */
    @Multipart
    @POST("upload/avatar")
    suspend fun uploadAvatar(@Part("avatar") file: MultipartBody.Part): UploadAvatarResult

    /**
     * 公共图片上传（申请友链等未登录场景）：字段名固定 `file`。
     * 与 [uploadAvatar] 分开，避免把用户/站点头像传到 avatar 目录。
     */
    @Multipart
    @POST("upload/public-image")
    suspend fun uploadPublicImage(@Part("file") file: MultipartBody.Part): UploadAvatarResult
}

data class UploadAvatarResult(
    val code: Int = 0,
    val message: String = "",
    val url: String? = null,
    @Json(name = "originalName") val originalName: String? = null
)