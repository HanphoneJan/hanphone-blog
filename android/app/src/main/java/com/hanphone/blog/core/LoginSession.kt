package com.hanphone.blog.core

import android.content.Context
import com.hanphone.blog.data.auth.SessionSnapshot
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.LoginData

/**
 * 保存一次成功的登录结果（密码登录 / 注册 / 第三方登录共用）。
 *
 * 三个入口必须写同一套字段：
 * - [TokenStore]：内存，OkHttp 拦截器与 UI 立即读到；
 * - DataStore：下次启动恢复（含 refreshToken）。
 * 漏写 refreshToken 会退化成「30 分钟就掉线」，以前两处各写一遍正是这么漏的。
 */
suspend fun Context.applyLogin(data: LoginData) {
    val token = data.token ?: return
    val user = data.user ?: return
    TokenStore.apply(
        SessionSnapshot(
            token = token,
            userId = user.id,
            nickname = user.nickname,
            avatar = user.avatar,
            userType = user.type,
            username = user.username,
            refreshToken = data.refreshToken,
            email = user.email
        )
    )
}
