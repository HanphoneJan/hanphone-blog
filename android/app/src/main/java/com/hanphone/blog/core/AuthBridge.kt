package com.hanphone.blog.core

import android.webkit.WebStorage
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/**
 * App 登录态 → 第一方 WebView 页面的桥接。
 *
 * ## 为什么需要
 *
 * 照片墙（`https://hanphone.cn/atlas/`）是自家站点，但它是独立部署的 Vue SPA，
 * 登录态存在**它自己的 localStorage** 里（`token` / `userInfo` / `expire`），
 * 跟 App 的 DataStore 是两套互不相通的存储。
 *
 * 之前 Android 侧完全没有注入，于是出现过一个很迷惑的现象：明明从没给 WebView 写过 token，
 * 照片墙却显示「已登录」。实际原因是照片墙**自带的登录页**在 WebView 里被用过一次，
 * `domStorageEnabled = true` 让 localStorage 按 origin 持久留在 App 数据目录里，
 * 之后每次进入都带着那个 token。第一方页面理应和 App 共用一份登录态，而不是
 * 各存一份、还会因为「用哪个入口登的」而长期不一致。
 *
 * ## 为什么用 addDocumentStartJavaScript
 *
 * 照片墙的 Pinia store 在**模块初始化时同步**读 localStorage
 * （`apps/photo-wall/src/store/store.ts`），所以 token 必须在页面自己的 JS 之前写好。
 * `WebViewCompat.addDocumentStartJavaScript` 正好在文档开始、页面脚本之前执行，
 * 用 `onPageFinished` + `evaluateJavascript` 会晚一拍（那时 store 已经初始化完了）。
 *
 * ## 安全边界
 *
 * 注入**只对白名单 origin 生效**（见 [FIRST_PARTY_ORIGINS]）。项目页会打开任意外部链接，
 * 绝不能把登录 token 发给第三方站点。
 */
object AuthBridge {

    /** 允许接收登录态的第一方 origin。改动前想清楚：这里加进来的域名会拿到用户 token。 */
    val FIRST_PARTY_ORIGINS = setOf("https://hanphone.cn", "https://www.hanphone.cn")

    /** 照片墙 localStorage 里用到的键 */
    private val LS_TOKEN = "token"
    private val LS_EXPIRE = "expire"
    private val LS_USER_INFO = "userInfo"

    /**
     * 构造注入脚本：把 App 当前的登录态同步到页面 localStorage。
     *
     * App 未登录时**主动删除**这些键 —— 否则用户在照片墙里单独登录过、
     * 之后又在 App 里退出登录，照片墙仍会带着旧 token 显示已登录（安全漏洞）。
     *
     * 注意注入脚本里不能出现换行/分号歧义，全部用 try-catch 包裹单项操作，
     * 任何一项失败都不影响其余项，更不能让注入异常导致页面加载失败。
     */
    fun injectionScript(auth: AuthData): String {
        val token = auth.token?.takeIf { it.isNotBlank() }

        if (token == null) {
            return listOf(LS_TOKEN, LS_EXPIRE, LS_USER_INFO).joinToString("") { key ->
                "try{localStorage.removeItem('$key')}catch(e){};"
            }
        }

        // 照片墙 store 读取的字段：id / type（判管理员）/ username / nickname / avatar
        // 其余字段（email、登录省市等）照片墙只在登录页自己填时才有，这里不臆造。
        val userInfo = JSONObject().apply {
            put("id", auth.userId ?: JSONObject.NULL)
            put("type", auth.userType ?: "")
            put("username", auth.username ?: auth.nickname ?: "")
            put("nickname", auth.nickname ?: "")
            put("avatar", auth.avatar ?: "")
        }

        return buildString {
            append("try{localStorage.setItem('").append(LS_TOKEN).append("',").append(JSONObject.quote(token)).append(");}catch(e){};")
            append("try{localStorage.removeItem('").append(LS_EXPIRE).append("');}catch(e){};")
            append("try{localStorage.setItem('").append(LS_USER_INFO).append("',")
                .append(JSONObject.quote(userInfo.toString())).append(");}catch(e){};")
        }
    }

    /**
     * 把登录态注入脚本挂到 WebView 上（仅第一方 origin 生效）。
     *
     * 必须在 [auth] 变化时重新调用：App 登录/退出后已经打开的 WebView 实例不会自动更新，
     * 而 WebView 会在下次导航时重新执行文档开始脚本，所以「重新挂一次」即可覆盖后续导航。
     */
    fun install(webView: WebView, auth: AuthData) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            // 老 WebView（< 83）降级：页面加载完成后再补写，并刷新一次让它生效。
            // 照片墙 store 是同步初始化的，所以必须 reload 才吃得到。
            webView.post {
                webView.evaluateJavascript(injectionScript(auth), null)
                webView.reload()
            }
            return
        }
        WebViewCompat.addDocumentStartJavaScript(
            webView,
            injectionScript(auth),
            FIRST_PARTY_ORIGINS
        )
    }

    /**
     * 退出登录时清掉 WebView 里的残留登录态。
     *
     * 用 [WebStorage.deleteAllData] 而不是 `evaluateJavascript("localStorage.clear()")`：
     * 后者要求 WebView 实例存活，而登出时页面往往已经被销毁。
     * [WebStorage] 只管 localStorage/sessionStorage，不会误删 Cache Storage（Service Worker 资源缓存）。
     */
    fun clearWebStorage() {
        runCatching { WebStorage.getInstance().deleteAllData() }
    }
}