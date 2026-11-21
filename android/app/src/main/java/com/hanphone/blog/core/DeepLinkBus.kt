package com.hanphone.blog.core

import com.hanphone.blog.util.DeepLink
import com.hanphone.blog.util.DeepLinkTarget
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 深链中转站：MainActivity 收到 intent 后投递原始 URL，AppNav 收集后导航并消费。
 *
 * 用 StateFlow 而不是 SharedFlow：冷启动时 MainActivity 在 setContent 之前就可能拿到
 * intent（onCreate 里 handle），此时界面还没开始收集——StateFlow 会把值留给后来的收集者。
 */
object DeepLinkBus {

    private val _pending = MutableStateFlow<DeepLinkTarget?>(null)
    val pending: StateFlow<DeepLinkTarget?> = _pending.asStateFlow()

    private var lastRaw: String? = null

    /**
     * 投递一个 URL。同一个 raw 在**尚未消费**时重复投递（onCreate + onNewIntent、
     * 系统重复派发）只处理一次；消费后再点同一个链接仍然要能跳转。
     */
    fun handle(raw: String?) {
        if (raw.isNullOrBlank()) return
        if (raw == lastRaw && _pending.value != null) return

        val target = DeepLink.parse(raw) ?: return
        lastRaw = raw
        _pending.value = target
    }

    /** 导航完成后清空，避免旋转/重组时重复跳转 */
    fun consume() {
        _pending.value = null
    }
}
