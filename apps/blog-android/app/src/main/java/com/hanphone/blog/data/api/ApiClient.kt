package com.hanphone.blog.data.api

import com.hanphone.blog.BuildConfig
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
import java.util.UUID
import java.util.concurrent.TimeUnit

object ApiClient {

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
    val api: BlogApi by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val req = chain.request()
                val token = TokenStore.token.value
                if (token != null) {
                    chain.proceed(req.newBuilder().header("Token", token).build())
                } else {
                    chain.proceed(req)
                }
            }
            .addInterceptor { chain ->
                // 博客 API token 失效（401）→ 自动清除登录态，UI 自动切回未登录。
                // chat-api（独立服务，内部还会校验用户存在性）的 401/403 不代表博客登录态失效，跳过。
                val req = chain.request()
                val resp = chain.proceed(req)
                if (resp.code == 401 && !req.url.encodedPath.endsWith("/login")
                    && !req.url.encodedPath.contains("/chat-api/")
                ) {
                    TokenStore.clear()
                }
                resp
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
            .create(BlogApi::class.java)
    }

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
}
