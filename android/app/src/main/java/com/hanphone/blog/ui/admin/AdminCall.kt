package com.hanphone.blog.ui.admin

import com.hanphone.blog.data.model.ApiResult
import com.hanphone.blog.util.adminMessage

/**
 * 后台写操作的统一包装：成功返回 null，失败返回可直接提示的文案。
 *
 * 统一了两种失败来源：接口 `flag=false`（用接口 message，空则兜底文案）和网络/HTTP 异常
 * （交给 [adminMessage] 映射）。页面/VM 侧只判 `err == null`，不再每处写一遍 try/catch。
 */
suspend fun adminOp(fallback: String, block: suspend () -> ApiResult<*>): String? =
    try {
        val res = block()
        if (res.flag) null else res.message.ifBlank { fallback }
    } catch (e: Exception) {
        e.adminMessage(fallback)
    }
