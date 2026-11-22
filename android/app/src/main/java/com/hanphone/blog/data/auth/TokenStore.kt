package com.hanphone.blog.data.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** 一次登录态的快照：TokenStore 与 DataStore 之间只传这一个对象，避免 6 个位置参数传错 */
data class SessionSnapshot(
    val token: String? = null,
    val userId: Long? = null,
    val nickname: String? = null,
    val avatar: String? = null,
    val userType: String? = null,
    val username: String? = null,
    val refreshToken: String? = null,
    /** 邮箱：仅用于第一方 WebView（后台个人中心）注入 userInfo，App 自身展示不用 */
    val email: String? = null
)

/**
 * 登录态的唯一入口：进程级内存（OkHttp 拦截器/UI 立即读到）+ 落盘（DataStore）。
 *
 * 之前内存与磁盘由各处手工同步（登录、改资料、资料刷新各写一遍，6 个位置参数），
 * 漏一个字段就出现「30 分钟掉线」或「头像不更新」。现在：
 * - [apply]：登录 / 资料更新，写内存并落盘；
 * - [restore]：App 启动从磁盘恢复，不回写；
 * - [updateTokens]：静默续期，写 token 并落盘。
 * 磁盘实现由 BlogApplication 注入 [persistSnapshot]，网络层不需要持有 Context。
 */
object TokenStore {

    private val _token = MutableStateFlow<String?>(null)
    private val _userId = MutableStateFlow<Long?>(null)
    private val _nickname = MutableStateFlow<String?>(null)
    private val _avatar = MutableStateFlow<String?>(null)
    private val _userType = MutableStateFlow<String?>(null)
    private val _username = MutableStateFlow<String?>(null)
    private val _refreshToken = MutableStateFlow<String?>(null)
    private val _email = MutableStateFlow<String?>(null)

    val token: StateFlow<String?> get() = _token
    val userId: StateFlow<Long?> get() = _userId
    val nickname: StateFlow<String?> get() = _nickname
    val avatar: StateFlow<String?> get() = _avatar
    val userType: StateFlow<String?> get() = _userType
    val username: StateFlow<String?> get() = _username
    val refreshToken: StateFlow<String?> get() = _refreshToken
    val email: StateFlow<String?> get() = _email

    /** 落盘实现（BlogApplication 注入）：DataStore 只认这个快照 */
    var persistSnapshot: ((SessionSnapshot) -> Unit)? = null

    val isLoggedIn: Boolean
        get() = _token.value != null && _userId.value != null

    val isAdmin: Boolean
        get() = _userType.value == "1"

    fun snapshot(): SessionSnapshot = SessionSnapshot(
        token = _token.value,
        userId = _userId.value,
        nickname = _nickname.value,
        avatar = _avatar.value,
        userType = _userType.value,
        username = _username.value,
        refreshToken = _refreshToken.value,
        email = _email.value
    )

    /** App 启动：从磁盘恢复到内存（不回写磁盘） */
    fun restore(snapshot: SessionSnapshot) {
        _token.value = snapshot.token
        _userId.value = snapshot.userId
        _nickname.value = snapshot.nickname
        _avatar.value = snapshot.avatar
        _userType.value = snapshot.userType
        _username.value = snapshot.username
        _refreshToken.value = snapshot.refreshToken
        _email.value = snapshot.email
    }

    /** 登录 / 资料更新：写内存 + 落盘 */
    fun apply(snapshot: SessionSnapshot) {
        restore(snapshot)
        persistSnapshot?.invoke(snapshot)
    }

    /** 只更新昵称/头像/身份（编辑资料或拉取最新资料后调用），其余字段保持 */
    fun updateProfile(
        nickname: String?,
        avatar: String?,
        userType: String? = null,
        email: String? = null
    ) {
        apply(
            snapshot().copy(
                nickname = nickname ?: _nickname.value,
                avatar = avatar ?: _avatar.value,
                userType = userType ?: _userType.value,
                email = email ?: _email.value
            )
        )
    }

    /** 静默续期：更新 access + refresh 并落盘 */
    fun updateTokens(token: String, refreshToken: String?) {
        _token.value = token
        _refreshToken.value = refreshToken
        persistSnapshot?.invoke(snapshot())
    }

    fun currentUserName(): String = _nickname.value ?: ""

    fun clear() {
        _token.value = null
        _userId.value = null
        _nickname.value = null
        _avatar.value = null
        _userType.value = null
        _username.value = null
        _refreshToken.value = null
        _email.value = null
    }
}
