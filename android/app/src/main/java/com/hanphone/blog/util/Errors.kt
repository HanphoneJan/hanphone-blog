package com.hanphone.blog.util

import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * 后台请求失败的提示文案。
 *
 * 直接抛 `e.message` 会把 "HTTP 400" / "HTTP 403" 这种原始信息弹给用户，
 * 而后台接口的 400/401/403 基本只有一种原因：token 里没有管理员权限或已过期。
 */
fun Throwable.adminMessage(fallback: String = "操作失败"): String = when (this) {
    is HttpException -> when (code()) {
        400, 401 -> "登录状态无效或没有管理员权限，请重新登录"
        403 -> "没有管理员权限"
        404 -> "目标不存在或已被删除"
        in 500..599 -> "服务器开小差了（HTTP ${code()}），稍后再试"
        else -> "请求失败（HTTP ${code()}）"
    }
    is SocketTimeoutException -> "网络超时，请重试"
    is UnknownHostException -> "网络不可用，请检查网络"
    is IOException -> "网络异常，请重试"
    else -> message?.takeIf { it.isNotBlank() } ?: fallback
}
