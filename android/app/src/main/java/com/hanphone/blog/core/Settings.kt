package com.hanphone.blog.core

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "blog_settings")

private val KEY_THEME = stringPreferencesKey("theme_mode")   // system / light / dark
private val KEY_NICKNAME = stringPreferencesKey("nickname")   // 匿名评论昵称
private val KEY_EMAIL = stringPreferencesKey("email")         // 匿名评论邮箱

/**
 * 本地设置：主题模式 + 访客身份（匿名评论/留言用）。
 * 基于 DataStore（Preferences）。均为顶层扩展，直接 import 到页面使用。
 */
val Context.themeMode: Flow<String> get() = dataStore.data.map { it[KEY_THEME] ?: "system" }

val Context.guestNickname: Flow<String> get() = dataStore.data.map { it[KEY_NICKNAME] ?: "" }

val Context.guestEmail: Flow<String> get() = dataStore.data.map { it[KEY_EMAIL] ?: "" }

suspend fun Context.setThemeMode(mode: String) = dataStore.edit { it[KEY_THEME] = mode }

suspend fun Context.saveGuest(nickname: String, email: String) = dataStore.edit {
    it[KEY_NICKNAME] = nickname
    it[KEY_EMAIL] = email
}

// ===== 登录态持久化（token / userId / 昵称 / 头像）=====

private val KEY_TOKEN = stringPreferencesKey("auth_token")
private val KEY_USER_ID = stringPreferencesKey("auth_user_id")
private val KEY_AUTH_NICKNAME = stringPreferencesKey("auth_nickname")
private val KEY_AUTH_AVATAR = stringPreferencesKey("auth_avatar")
private val KEY_USER_TYPE = stringPreferencesKey("auth_user_type")
private val KEY_AUTH_USERNAME = stringPreferencesKey("auth_username")

data class AuthData(
    val token: String? = null,
    val userId: Long? = null,
    val nickname: String? = null,
    val avatar: String? = null,
    val userType: String? = null,
    /**
     * 登录名（不是昵称）。
     *
     * App 自身界面不用它，但注入照片墙 WebView 时需要：照片墙的 store 会读
     * `userInfo.username`（管理页按登录名定位当前用户、上传时作为作者名兜底）。
     * 之前没存，导致注入时只能拿昵称顶替。
     */
    val username: String? = null
)

val Context.auth: Flow<AuthData> get() = dataStore.data.map {
    AuthData(
        token = it[KEY_TOKEN].nullIfBlank(),
        userId = it[KEY_USER_ID]?.toLongOrNull(),
        nickname = it[KEY_AUTH_NICKNAME].nullIfBlank(),
        avatar = it[KEY_AUTH_AVATAR].nullIfBlank(),
        userType = it[KEY_USER_TYPE].nullIfBlank(),
        username = it[KEY_AUTH_USERNAME].nullIfBlank()
    )
}

suspend fun Context.saveAuth(auth: AuthData) = dataStore.edit {
    it[KEY_TOKEN] = auth.token ?: ""
    it[KEY_USER_ID] = auth.userId?.toString() ?: ""
    it[KEY_AUTH_NICKNAME] = auth.nickname ?: ""
    it[KEY_AUTH_AVATAR] = auth.avatar ?: ""
    it[KEY_USER_TYPE] = auth.userType ?: ""
    it[KEY_AUTH_USERNAME] = auth.username ?: ""
}

suspend fun Context.clearAuth() = dataStore.edit {
    it.remove(KEY_TOKEN)
    it.remove(KEY_USER_ID)
    it.remove(KEY_AUTH_NICKNAME)
    it.remove(KEY_AUTH_AVATAR)
    it.remove(KEY_USER_TYPE)
    it.remove(KEY_AUTH_USERNAME)
}

// ===== 个性化：自定义背景图 + 模糊 =====

private val KEY_BG_PATH = stringPreferencesKey("bg_path")
private val KEY_BG_BLUR = intPreferencesKey("bg_blur")

/** 自定义背景图文件路径（App 私有 filesDir 内），null = 未设置 */
val Context.backgroundPath: Flow<String?> get() = dataStore.data.map { it[KEY_BG_PATH] }

/** 背景模糊半径（dp） */
val Context.backgroundBlur: Flow<Int> get() = dataStore.data.map { it[KEY_BG_BLUR] ?: 10 }

suspend fun Context.setBackgroundPath(path: String?) = dataStore.edit {
    if (path == null) it.remove(KEY_BG_PATH) else it[KEY_BG_PATH] = path
}

suspend fun Context.setBackgroundBlur(radius: Int) = dataStore.edit { it[KEY_BG_BLUR] = radius }

// ===== 评论/留言输入草稿（DataStore 持久化，不随「清除全部」缓存清理删除）=====

private fun draftKey(kind: String) = stringPreferencesKey("draft_$kind")

/** 读取某类输入的草稿（kind 如 article_comment_12 / message_comment / essay_comment_5） */
fun Context.draftFlow(kind: String): Flow<String> = dataStore.data.map { it[draftKey(kind)] ?: "" }

/** 保存/清除草稿（传入空串即清除） */
suspend fun Context.saveDraft(kind: String, text: String) = dataStore.edit {
    if (text.isBlank()) it.remove(draftKey(kind)) else it[draftKey(kind)] = text
}

private fun String?.nullIfBlank(): String? = this?.takeIf { it.isNotBlank() }