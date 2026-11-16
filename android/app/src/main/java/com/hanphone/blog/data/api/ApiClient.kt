package com.hanphone.blog.data.api

import com.hanphone.blog.BuildConfig
import com.hanphone.blog.data.auth.TokenRefresher
import com.hanphone.blog.data.auth.TokenStore
import com.squareup.moshi.FromJson
import com.squareup.moshi.JsonReader
import com.squareup.moshi.JsonWriter
import com.squareup.moshi.Moshi
import com.squareup.moshi.ToJson
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.runBlocking
import java.util.UUID
import java.util.concurrent.TimeUnit

object ApiClient {

    /** 设备名（登录设备列表展示）：realme RMX6699 / Xiaomi 23127PN0CC … */
    private val deviceName: String by lazy {
        val manufacturer = android.os.Build.MANUFACTURER.orEmpty()
            .replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        val model = android.os.Build.MODEL.orEmpty()
        listOf(manufacturer, model).filter { it.isNotBlank() }.joinToString(" ")
    }

    /** 幂等写接口（评论/留言）的 X-Request-Id，后端 @Idempotent 用 */
    fun newRequestId(): String = UUID.randomUUID().toString()

    /**
     * Date 适配：后端可能返回 epoch 毫秒（数字）或 ISO/普通日期字符串。
     * Moshi 相比 Gson 的关键优势：Kotlin 非空字段缺失/为 null 时直接报错，
     * 而不是把 null 塞进非空类型埋雷到运行期。
     */
    private class BlogDateAdapter {
        private val formats = arrayOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US),
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US),
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US),
            SimpleDateFormat("yyyy-MM-dd", Locale.US)
        )

        @FromJson
        fun fromJson(reader: JsonReader): Date? {
            // 显式 JSON null（如热点聚合的 publishedAt / releaseDate 常为 null）必须放行，
            // 否则 nextString() 会在 NULL token 上抛异常，连累整个响应解析失败。
            if (reader.peek() == JsonReader.Token.NULL) {
                reader.nextNull<Unit>()
                return null
            }
            return if (reader.peek() == JsonReader.Token.NUMBER) {
                Date(reader.nextLong())
            } else {
                val s = reader.nextString()
                formats.firstNotNullOfOrNull { f ->
                    runCatching { f.parse(s) }.getOrNull()
                }
            }
        }

        @ToJson
        fun toJson(writer: JsonWriter, value: Date?) {
            if (value == null) {
                writer.nullValue()
                return
            }
            writer.value(formats[0].format(value))
        }
    }

    val moshi: Moshi by lazy {
        Moshi.Builder()
            .add(BlogDateAdapter())
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    private val logging: HttpLoggingInterceptor by lazy {
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }
    }

    /** 博客 API（hanphone.cn/api，自动注入 Token 头） */
    private val apiRetrofit: Retrofit by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val req = chain.request()
                val token = TokenStore.token.value
                val builder = req.newBuilder()
                if (token != null) builder.header("Token", token)
                // 登录设备列表展示用：不带这个头时后端只能按 UA 归类，显示成 "okhttp/4.12.0"
                builder.header("X-Device-Name", deviceName)
                chain.proceed(builder.build())
            }
            .addInterceptor { chain ->
                // 博客 API token 失效（401）→ 先用 refresh 静默续期并重放一次；
                // 续期失败才清登录态。chat-api 的 401 不代表博客登录态失效，跳过。
                val req = chain.request()
                val resp = chain.proceed(req)
                val path = req.url.encodedPath
                val canRetry = resp.code == 401 &&
                    !path.contains("/login") &&
                    !path.contains("/auth/") &&
                    !path.contains("/chat-api/")

                if (!canRetry) {
                    resp
                } else {
                    val stale = TokenStore.token.value
                    val newToken = runBlocking { TokenRefresher.refresh(stale) }
                    if (newToken == null) {
                        TokenStore.clear()
                        resp
                    } else {
                        resp.close()
                        chain.proceed(req.newBuilder().header("Token", newToken).build())
                    }
                }
            }
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    val api: BlogApi by lazy { apiRetrofit.create(BlogApi::class.java) }

    /** 后台管理 API：与公开接口同一 baseUrl / Token 拦截器，后端按 token 内 userType=1 放行 */
    val adminApi: AdminApi by lazy { apiRetrofit.create(AdminApi::class.java) }

    /** 文件服务 API（hanphone.top，上传等；无需博客 Token） */
    val fileApi: FileApi by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl("https://hanphone.top/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(FileApi::class.java)
    }

    /**
     * 后台文件 API（admin-file，带 Token）。
     * 单独一个 OkHttpClient：与公共 fileApi 分开，避免把用户凭证发给 /upload/avatar。
     */
    val adminFileApi: AdminFileApi by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val token = TokenStore.token.value
                if (token != null) {
                    chain.proceed(chain.request().newBuilder().header("Token", token).build())
                } else {
                    chain.proceed(chain.request())
                }
            }
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(180, TimeUnit.SECONDS)
            .writeTimeout(180, TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl("https://hanphone.top/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(AdminFileApi::class.java)
    }
}
