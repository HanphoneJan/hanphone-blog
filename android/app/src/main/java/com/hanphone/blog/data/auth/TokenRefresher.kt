package com.hanphone.blog.data.auth

import com.hanphone.blog.data.api.ApiClient
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * access token 静默续期（单飞）。
 *
 * - 401 拦截器与启动检查都走这里：**并发时只发一次刷新请求**，避免轮换互相作废；
 * - 传入「触发刷新的那个旧 token」，如果别的线程已经换过了就直接复用新值（不重复刷新）；
 * - 刷新失败返回 null，由调用方清登录态。
 */
object TokenRefresher {

    private val mutex = Mutex()

    suspend fun refresh(staleToken: String?): String? = mutex.withLock {
        val current = TokenStore.token.value
        // 已经有人刷新过了
        if (current != null && current != staleToken) return@withLock current

        val refreshToken = TokenStore.refreshToken.value ?: return@withLock null

        val res = runCatching {
            ApiClient.api.refreshTokens(mapOf("refreshToken" to refreshToken))
        }.getOrNull()

        val data = res?.data
        if (res?.flag != true || data?.token == null) {
            return@withLock null
        }

        TokenStore.updateTokens(data.token, data.refreshToken ?: refreshToken)
        data.token
    }
}
