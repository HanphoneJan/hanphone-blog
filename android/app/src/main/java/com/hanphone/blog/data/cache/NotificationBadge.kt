package com.hanphone.blog.data.cache

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 站内通知未读数（进程级）：只用于「我的 → 更多 → 通知」入口的副标题。
 *
 * 不并入底部「消息」Tab 的红点——那里是私信语义，两者混在一起会让人误解。
 * 「我的」页刷新时由 ProfileViewModel 拉 `/notifications/unread-count`，
 * 通知页读/全部已读后由 NotificationsViewModel 就地更新。
 */
object NotificationBadge {

    private val _unread = MutableStateFlow(0L)
    val unread: StateFlow<Long> = _unread.asStateFlow()

    fun set(value: Long) {
        _unread.value = value.coerceAtLeast(0)
    }

    fun clear() {
        _unread.value = 0
    }
}
