package com.hanphone.blog.data.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.core.applyLogin
import com.hanphone.blog.data.repo.BlogRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * 第三方登录：外部浏览器授权 → 自定义 scheme 回跳 → 一次性 code 换会话。
 *
 * 流程：
 * 1. 登录页用 [start] 打开 `…/oauth/github/authorize?state=app`（系统浏览器）；
 * 2. 服务端回调只把**一次性 code** 放进 https 中转页 `/oauth/app/return`，token 不进 URL；
 *    - App Links 校验通过（`assetlinks.json` 已部署）时，系统直接把该 https URL 交给 App，不经过浏览器；
 *    - 否则浏览器显示中转页：自动尝试 + 按钮跳 `hanphone://oauth/callback`；
 * 3. [MainActivity][com.hanphone.blog.MainActivity] 收到该链接 → [exchange] →
 *    `POST /oauth/app/exchange` → 与密码登录完全一样地落盘；
 * 4. `App.kt` 观察 [lastResult]：成功提示并收掉还开着的登录页，失败提示原因。
 *
 * 为什么不用内嵌 WebView：GitHub 授权页禁止被 iframe/内嵌（反钓鱼），
 * 而且 WebView 里的登录态落在它自己的 localStorage，与 App 的 DataStore 互不相通。
 */
object OAuthLogin {

    /** 服务端约定的 state：带 `app` 时回调改跳自定义 scheme（见 OAuthController） */
    private const val STATE_APP = "app"

    /** AndroidManifest 中 MainActivity 的 intent-filter：scheme + host */
    const val SCHEME = "hanphone"
    const val HOST = "oauth"

    const val GITHUB = "github"
    const val GOOGLE = "google"

    sealed interface Outcome {
        data class Success(val provider: String) : Outcome
        data class Failure(val message: String) : Outcome
    }

    private val _lastResult = MutableStateFlow<Outcome?>(null)

    /** 最近一次授权结果：App 根消费后调用 [clearResult]（冷启动时也能读到，故不用 SharedFlow） */
    val lastResult: StateFlow<Outcome?> get() = _lastResult

    fun clearResult() {
        _lastResult.value = null
    }

    /** 授权入口地址；`API_BASE_URL` 已带 `/api/` 与结尾斜杠 */
    fun authorizeUrl(provider: String): String =
        "${BuildConfig.API_BASE_URL}oauth/$provider/authorize?state=$STATE_APP"

    /** 打开系统浏览器完成授权（部分设备没有浏览器时由调用方兜底提示） */
    fun start(context: Context, provider: String) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(authorizeUrl(provider))))
    }

    /** 是否是本 App 的授权回跳（App Links 的 https 或兜底的 hanphone://） */
    fun isCallback(uri: Uri?): Boolean {
        if (uri == null) return false
        if (uri.scheme == SCHEME && uri.host == HOST) return true
        // App Links：https://hanphone.cn/api/oauth/app/return?code=…（assetlinks.json 校验通过时系统直接交给 App）
        val path = uri.path.orEmpty()
        return uri.scheme == "https" &&
            (uri.host == "hanphone.cn" || uri.host == "www.hanphone.cn") &&
            (path.startsWith("/api/oauth/app/") || path.startsWith("/oauth/app/"))
    }

    /**
     * 用回跳里的一次性 code 换会话并保存登录态。
     * 任何异常都收敛成 [Outcome.Failure]，不向调用方抛。
     */
    suspend fun exchange(context: Context, provider: String, code: String) {
        _lastResult.value = try {
            val res = BlogRepository().exchangeOAuthCode(code)
            val data = res.data
            if (res.flag && data?.token != null && data.user != null) {
                context.applyLogin(data)
                Outcome.Success(provider)
            } else {
                Outcome.Failure(res.message.ifBlank { "登录失败，请重试" })
            }
        } catch (e: Exception) {
            Outcome.Failure(e.message ?: "网络错误")
        }
    }

    /** 文案用：github → GitHub */
    fun label(provider: String): String = when (provider) {
        GITHUB -> "GitHub"
        GOOGLE -> "Google"
        else -> provider.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    }

    /** 回调里只有 error（用户取消 / 服务端异常）时直接反馈，不发起兑换 */
    fun failed(message: String) {
        _lastResult.value = Outcome.Failure(message)
    }
}
