package com.hanphone.blog.data.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.hanphone.blog.data.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * 登录态内存存储：进程级单例，OkHttp 拦截器读 token 注入请求头。
 * 持久化由 DataStore 负责（Settings.kt 的 auth ），App 启动时恢复到本类。
 */
object TokenStore {

    private val _token = MutableStateFlow<String?>(null)
    private val _userId = MutableStateFlow<Long?>(null)
    private val _nickname = MutableStateFlow<String?>(null)
    private val _avatar = MutableStateFlow<String?>(null)
    private val _userType = MutableStateFlow<String?>(null)

    val token: StateFlow<String?> get() = _token
    val userId: StateFlow<Long?> get() = _userId
    val nickname: StateFlow<String?> get() = _nickname
    val avatar: StateFlow<String?> get() = _avatar
    val userType: StateFlow<String?> get() = _userType

    val isLoggedIn: Boolean
        get() = _token.value != null && _userId.value != null

    val isAdmin: Boolean
        get() = _userType.value == "1"

    /** 恢复持久化登录态（App 启动/登录成功时调用） */
    fun restore(token: String?, userId: Long?, nickname: String?, avatar: String?, userType: String? = null) {
        _token.value = token
        _userId.value = userId
        _nickname.value = nickname
        _avatar.value = avatar
        _userType.value = userType
    }

    fun currentUserName(): String = _nickname.value ?: ""

    fun clear() {
        _token.value = null
        _userId.value = null
        _nickname.value = null
        _avatar.value = null
        _userType.value = null
    }
}