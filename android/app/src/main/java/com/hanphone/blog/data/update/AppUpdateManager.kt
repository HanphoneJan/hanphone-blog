package com.hanphone.blog.data.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import com.hanphone.blog.BuildConfig
import com.hanphone.blog.core.autoCheckUpdate
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * App 内更新：检查 GitHub Release、直接下载 APK，再交给系统安装器。
 *
 * 下载放在应用级协程里（不随设置页销毁而中断），进度通过 [state] 暴露给 UI。
 * 首次安装需要在系统设置里允许「安装未知应用」，[canInstall] / [openInstallPermission] 处理这一步。
 *
 * 更新提示（发现新版本弹窗）由根界面统一渲染（[com.hanphone.blog.ui.components.UpdateDialogs]），
 * 手动检查与启动检查都只是把结果写进 [offer]，避免两处各弹一个对话框。
 */
object AppUpdateManager {

    /** 一次「有新版」的检查结果：版本号（如 v1.3.0）、Release 说明、APK 直链 */
    data class UpdateInfo(val version: String, val body: String, val apkUrl: String)

    sealed interface State {
        data object Idle : State
        data class Downloading(
            val version: String,
            val percent: Int,
            val downloaded: Long,
            val total: Long
        ) : State

        data class Ready(val version: String, val file: File) : State
        data class Failed(val version: String, val message: String) : State
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null
    @Volatile
    private var activeCall: okhttp3.Call? = null

    /**
     * 下载代号：取消/替换后旧任务的收尾结果（含 socket 被关掉抛出的 IOException）不能再改 UI 状态，
     * 否则取消下载会误弹「下载失败」。
     */
    @Volatile
    private var generation = 0

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    private val _state = MutableStateFlow<State>(State.Idle)
    val state: StateFlow<State> = _state.asStateFlow()

    /** 待提示的新版本（手动检查或启动检查发现后由根界面弹窗消费） */
    private val _offer = MutableStateFlow<UpdateInfo?>(null)
    val offer: StateFlow<UpdateInfo?> = _offer.asStateFlow()

    /** 本进程是否已经做过启动检查（避免旋转屏幕 / 页面重建时重复请求） */
    @Volatile
    private var startupChecked = false

    /** 把检查结果显示成「发现新版本」弹窗 */
    fun offerUpdate(info: UpdateInfo) {
        _offer.value = info
    }

    /** 关掉「发现新版本」弹窗（选择稍后 / 已开始下载） */
    fun dismissOffer() {
        _offer.value = null
    }

    /**
     * 启动时自动检查更新：受设置项「启动时检查更新」控制（默认开启），
     * 每个进程只查一次，网络失败静默忽略（不打扰启动），发现新版写进 [offer]。
     */
    fun checkOnStartup(context: Context) {
        if (startupChecked) return
        startupChecked = true
        val app = context.applicationContext
        scope.launch {
            if (!app.autoCheckUpdate.first()) return@launch
            val info = runCatching { fetchLatest() }.getOrNull() ?: return@launch
            if (_offer.value == null) _offer.value = info
        }
    }

    /** 拉取 GitHub 最新 Release：比当前版本新且带 APK 资产时返回信息，否则 null；网络/解析失败抛异常 */
    suspend fun fetchLatest(): UpdateInfo? = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(RELEASE_API)
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "hanphone-blog-android/${BuildConfig.VERSION_NAME}")
            .build()
        val json = client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("HTTP ${response.code}")
            response.body?.string() ?: throw IOException("空响应")
        }
        val obj = JSONObject(json)
        val tag = obj.optString("tag_name", "")
        val body = obj.optString("body", "")
        var apkUrl = ""
        val assets = obj.optJSONArray("assets")
        if (assets != null) {
            for (i in 0 until assets.length()) {
                val a = assets.getJSONObject(i)
                if (a.optString("name", "").endsWith(".apk", ignoreCase = true)) {
                    apkUrl = a.optString("browser_download_url", "")
                    break
                }
            }
        }
        if (tag.isBlank() || apkUrl.isBlank() || !isNewerVersion(tag, BuildConfig.VERSION_NAME)) {
            null
        } else {
            UpdateInfo(version = tag, body = body, apkUrl = apkUrl)
        }
    }

    /** 下载指定版本的 APK；重复调用会取消上一次下载 */
    fun download(context: Context, url: String, version: String) {
        job?.cancel()
        // 每次下载一个代号：旧任务（被取消/被替换）的收尾结果不能再改 UI 状态
        val gen = ++generation
        val app = context.applicationContext
        _state.value = State.Downloading(version, 0, 0, 0)
        job = scope.launch {
            try {
                val file = downloadInternal(app, url, version)
                if (gen == generation) _state.value = State.Ready(version, file)
            } catch (e: CancellationException) {
                cleanup(app, version)
                if (gen == generation) _state.value = State.Idle
                throw e
            } catch (e: Exception) {
                cleanup(app, version)
                // 取消时底层 socket 被关掉会抛 "Socket closed"，这不是失败，静默回到空闲
                if (gen == generation) _state.value = State.Failed(version, e.message ?: "下载失败")
            }
        }
    }

    fun cancel() {
        generation++
        job?.cancel()
        job = null
        activeCall?.cancel()
        activeCall = null
        _state.value = State.Idle
    }

    fun reset() {
        _state.value = State.Idle
    }

    /** 系统是否允许本应用安装 APK（Android 8+ 需要用户授权） */
    fun canInstall(context: Context): Boolean =
        android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O ||
            context.packageManager.canRequestPackageInstalls()

    /** 「安装未知应用」授权页的 Intent（用 launcher 启动时可在返回后继续安装） */
    fun installPermissionIntent(context: Context): Intent = Intent(
        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
        Uri.parse("package:${context.packageName}")
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    /** 直接打开「安装未知应用」授权页 */
    fun openInstallPermission(context: Context) {
        runCatching { context.startActivity(installPermissionIntent(context)) }
    }

    /** 调起系统安装器（安装确认仍是系统 UI，这是 Android 的安全要求） */
    fun install(context: Context, file: File) {
        if (!file.exists()) return
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(intent)
    }

    private suspend fun downloadInternal(context: Context, url: String, version: String): File {
        val dir = File(context.cacheDir, "updates").apply { mkdirs() }
        val target = File(dir, "hanphone-$version.apk")
        val tmp = File(dir, "hanphone-$version.apk.part")
        if (tmp.exists()) tmp.delete()

        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "hanphone-blog-android/${version}")
            .build()

        val call = client.newCall(request)
        activeCall = call
        try {
            call.execute().use { response ->
                if (!response.isSuccessful) throw IOException("下载失败：HTTP ${response.code}")
                val body = response.body ?: throw IOException("下载失败：空响应")
                val total = body.contentLength()
                var downloaded = 0L
                var lastPercent = -1

                body.byteStream().use { input ->
                    tmp.outputStream().use { output ->
                        val buffer = ByteArray(64 * 1024)
                        while (true) {
                            kotlin.coroutines.coroutineContext.ensureActive()
                            val read = input.read(buffer)
                            if (read < 0) break
                            output.write(buffer, 0, read)
                            downloaded += read
                            val percent = if (total > 0) {
                                ((downloaded * 100) / total).toInt().coerceIn(0, 100)
                            } else {
                                0
                            }
                            if (percent != lastPercent) {
                                lastPercent = percent
                                _state.value = State.Downloading(version, percent, downloaded, total)
                            }
                        }
                    }
                }
            }
        } finally {
            activeCall = null
        }

        if (tmp.length() < 1_000_000L) {
            tmp.delete()
            throw IOException("安装包不完整（${tmp.length()} 字节）")
        }
        if (target.exists()) target.delete()
        if (!tmp.renameTo(target)) {
            tmp.copyTo(target, overwrite = true)
            tmp.delete()
        }
        return target
    }

    private fun cleanup(context: Context, version: String) {
        runCatching {
            File(context.cacheDir, "updates/hanphone-$version.apk.part").delete()
        }
    }
}

/** GitHub 最新 Release（取自发布仓库） */
private const val RELEASE_API = "https://api.github.com/repos/HanphoneJan/hanphone-blog/releases/latest"

/** 语义化版本比较：latest 是否比 current 新（支持 v 前缀与可不齐的段） */
internal fun isNewerVersion(latest: String, current: String): Boolean {
    fun parse(v: String): List<Int> = v.trim().removePrefix("v").split('.').map { it.toIntOrNull() ?: 0 }
    val l = parse(latest)
    val c = parse(current)
    for (i in 0 until maxOf(l.size, c.size)) {
        val a = l.getOrElse(i) { 0 }
        val b = c.getOrElse(i) { 0 }
        if (a != b) return a > b
    }
    return false
}
