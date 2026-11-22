package com.hanphone.blog.ui.settings

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.core.AuthBridge
import com.hanphone.blog.core.clearAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 设置页账号区：退出登录。
 *
 * 完整流程放在 ViewModel（而不是页面回调）：先吊销服务端会话（失败也继续），
 * 再清 DataStore / 内存登录态 / 照片墙 WebView 登录态。旋转时页面重建也不会漏清。
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repo: BlogRepository
) : ViewModel() {

    var loggingOut by mutableStateOf(false)
        private set

    /** 退出完成：页面据此提示并返回「我的」 */
    var loggedOut by mutableStateOf(false)
        private set

    fun logout() {
        if (loggingOut) return
        viewModelScope.launch {
            loggingOut = true
            // 先吊销服务端会话（refresh 立刻失效）；失败无所谓，本地照样清
            runCatching { repo.logout(TokenStore.refreshToken.value) }
            context.clearAuth()
            TokenStore.clear()
            // 第一方 WebView（照片墙）把登录态存在自己的 localStorage 里，
            // 不清的话退出登录后照片墙仍显示已登录、还能点赞/进管理页
            AuthBridge.clearWebStorage()
            loggingOut = false
            loggedOut = true
        }
    }

    fun consumeLoggedOut() {
        loggedOut = false
    }
}
