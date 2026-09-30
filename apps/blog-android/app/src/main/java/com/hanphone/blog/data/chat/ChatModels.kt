package com.hanphone.blog.data.chat

/** 聊天连接状态 */
enum class ChatConnectionState { DISCONNECTED, CONNECTING, CONNECTED, ERROR }

/**
 * 公共聊天室消息（对应 server 端 PublicMessage：snake_case 字段）。
 * timestamp 为 ISO 字符串，UI 层格式化显示。
 */
data class PublicChatMessage(
    val id: Long = 0,
    val userId: Long? = null,
    val nickname: String = "匿名",
    val avatar: String? = null,
    val content: String = "",
    val fromAi: Boolean = false,
    val timestamp: String = "",
    val tempId: String? = null
)

/** 私信消息（与管理员/个人的对话） */
data class PrivateChatMessage(
    val id: Long = 0,
    val senderId: Long = 0,
    val receiverId: Long = 0,
    val content: String = "",
    val timestamp: String = "",
    val isRead: Boolean = false,
    val toAi: Boolean = false,
    val fromAi: Boolean = false
)

/** GET /chat-api/api/messages/admin 返回结构 */
data class ChatMessagesResponse(
    val success: Boolean = false,
    val messages: List<PrivateChatMessage> = emptyList()
)

/** 聊天用户（管理员收件箱用） */
data class ChatUser(
    val id: Long = 0,
    val username: String = "",
    val nickname: String = "",
    val avatar: String? = null,
    val isOnline: Boolean = false
)

/** GET /chat-api/api/users/all 返回结构（管理员） */
data class ChatUsersResponse(
    val success: Boolean = false,
    val users: List<ChatUser> = emptyList()
)