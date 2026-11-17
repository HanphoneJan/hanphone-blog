package com.hanphone.blog.data.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * App 内更新：直接下载 GitHub Release 的 APK，再交给系统安装器。
 *
 * 下载放在应用级协程里（不随设置页销毁而中断），进度通过 [state] 暴露给 UI。
 * 首次安装需要在系统设置里允许「安装未知应用」，[canInstall] / [openInstallPermission] 处理这一步。
 */
object AppUpdateManager {

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

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    private val _state = MutableStateFlow<State>(State.Idle)
    val state: StateFlow<State> = _state.asStateFlow()

    /** 下载指定版本的 APK；重复调用会取消上一次下载 */
    fun download(context: Context, url: String, version: String) {
        job?.cancel()
        val app = context.applicationContext
        _state.value = State.Downloading(version, 0, 0, 0)
        job = scope.launch {
            try {
                val file = downloadInternal(app, url, version)
                _state.value = State.Ready(version, file)
            } catch (e: CancellationException) {
                cleanup(app, version)
                _state.value = State.Idle
                throw e
            } catch (e: Exception) {
                cleanup(app, version)
                _state.value = State.Failed(version, e.message ?: "下载失败")
            }
        }
    }

    fun cancel() {
        job?.cancel()
        job = null
        activeCall?.cancel()
        activeCall = null
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
