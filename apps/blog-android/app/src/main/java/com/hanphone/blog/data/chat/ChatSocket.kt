package com.hanphone.blog.data.chat

import io.socket.client.IO
import io.socket.client.Socket
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.cache.ContentStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject

/**
 * 原生聊天 Socket 服务（socket.io-client）。
 * - 连接 https://hanphone.cn + path /chat-api/socket.io
 * - 使用博客 JWT 通过 authenticate 事件认证
 * - 对接公共聊天室：publicMessage / requestPublicHistory / AI 流式 / 在线人数
 *
 * 单例常驻，切换页面不断连；线程安全（StateFlow）。
 */
object ChatSocket {

    private var socket: Socket? = null

    private val _state = MutableStateFlow(ChatConnectionState.DISCONNECTED)
    val state: StateFlow<ChatConnectionState> = _state

    private val _messages = MutableStateFlow<List<PublicChatMessage>>(emptyList())
    val messages: StateFlow<List<PublicChatMessage>> = _messages

    private val _onlineCount = MutableStateFlow(0)
    val onlineCount: StateFlow<Int> = _onlineCount

    /** 最近的提示/错误（弹窗 toast 用） */
    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice

    /** 私信消息（与管理员对话，实时接收追加） */
    private val _privateMessages = MutableStateFlow<List<PrivateChatMessage>>(emptyList())
    val privateMessages: StateFlow<List<PrivateChatMessage>> = _privateMessages

    /** 最新一条私信（管理员会话联动用） */
    private val _lastPrivate = MutableStateFlow<PrivateChatMessage?>(null)
    val lastPrivate: StateFlow<PrivateChatMessage?> = _lastPrivate

    /** 在线用户列表（管理员收件箱用，userListUpdated 事件） */
    private val _userList = MutableStateFlow<List<ChatUser>>(emptyList())
    val userList: StateFlow<List<ChatUser>> = _userList

    // AI 流式临时状态
    private var aiTempId: String? = null
    private val aiBuilder = StringBuilder()

    /** 是否为主动断开（登出）。断线重连期间不算错误 */
    @Volatile
    private var manuallyClosed = false

    /** 消息页是否处于可见状态（可见时不发系统通知）。由 ChatScreen 挂载/卸载时设置 */
    @Volatile
    var chatUiVisible: Boolean = false

    // 心跳：服务端 60s 无 'heartbeat' 事件会强制断开（与 Web 端一致，25s 一次）
    private val heartbeatScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var heartbeatJob: Job? = null

    // ===== 本地缓存（消息页首进秒显，连接后台刷新）=====
    private var lastPublicPersistAt = 0L

    /** 冷启动恢复：socket 尚未产出数据时，先用本地缓存秒显（已有更新则不覆盖） */
    fun restoreMessages(list: List<PublicChatMessage>) {
        if (!list.isNullOrEmpty() && _messages.value.isEmpty()) {
            _messages.value = list
        }
    }

    /** 持久化公共聊天室（节流 5s；force 用于断线/退出时立即落盘） */
    private fun persistPublic(force: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!force && now - lastPublicPersistAt < 5_000) return
        lastPublicPersistAt = now
        heartbeatScope.launch {
            ContentStore.writePublicChat(_messages.value.filter { it.tempId == null })
        }
    }

    private fun startHeartbeat(s: Socket) {
        heartbeatJob?.cancel()
        heartbeatJob = heartbeatScope.launch {
            while (isActive) {
                runCatching { s.emit("heartbeat") }
                delay(25_000)
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    fun connect(token: String) {
        val existing = socket
        if (existing != null) {
            // 实例已存在：幂等补连（已连接时调用无害），不重复注册事件
            manuallyClosed = false
            existing.connect()
            return
        }
        manuallyClosed = false
        _state.value = ChatConnectionState.CONNECTING
        _notice.value = null

        val options = IO.Options().apply {
            path = "/chat-api/socket.io"
            reconnection = true
            reconnectionDelay = 1000
            reconnectionDelayMax = 5000
            timeout = 20000
        }
        val s = IO.socket("https://hanphone.cn", options)
        socket = s

        s.on(Socket.EVENT_CONNECT) {
            _state.value = ChatConnectionState.CONNECTED
            s.emit("authenticate", token)
            s.emit("requestPublicHistory", JSONObject().put("limit", 100))
            startHeartbeat(s)
        }
        s.on(Socket.EVENT_DISCONNECT) {
            // 非手动断开时 socket.io 会自动重连，此间视为"重连中"而非失败
            stopHeartbeat()
            persistPublic(force = true) // 断线前把最新消息落盘
            _state.value = if (manuallyClosed) ChatConnectionState.DISCONNECTED else ChatConnectionState.CONNECTING
        }
        s.on("reconnect_attempt") {
            _state.value = ChatConnectionState.CONNECTING
        }
        s.on(Socket.EVENT_CONNECT_ERROR) {
            // UI 已有重连提示条/状态展示，这里不再弹 toast
            _state.value = ChatConnectionState.ERROR
        }
        s.on("notification") { args ->
            args.firstOrNull()?.let {
                val text = it.toString()
                // 「认证成功」是每次连接都发的例行状态，弹 toast 只产生干扰——不进 notice 通道；
                // 其余为错误/操作类notification，仍会 toast 提示
                if (!text.startsWith("认证成功")) _notice.value = text
            }
        }
        s.on("publicHistory") { args ->
            val arr = args.firstOrNull() as? JSONArray ?: return@on
            _messages.value = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::parse) }
            persistPublic()
        }
        s.on("publicMessageBroadcast") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val msg = parse(obj)
            if (_messages.value.none { it.id == msg.id }) {
                _messages.value = _messages.value + msg
                persistPublic()
            }
        }
        s.on("publicOnlineCount") { args ->
            (args.firstOrNull() as? JSONObject)?.optInt("count")?.let { _onlineCount.value = it }
        }
        s.on("messageDeleted") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val id = obj.optLong("messageId")
            _messages.value = _messages.value.filterNot { it.id == id }
            persistPublic(force = true)
        }
        // AI 流式
        s.on("publicAiStreamStart") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val tempId = obj.optString("tempId", "temp_${System.currentTimeMillis()}")
            aiTempId = tempId
            aiBuilder.setLength(0)
            _messages.value = _messages.value + PublicChatMessage(
                id = -tempId.hashCode().toLong(),
                nickname = obj.optString("nickname", "寒枫"),
                avatar = if (obj.isNull("avatar")) null else obj.optString("avatar"),
                content = "",
                fromAi = true,
                timestamp = "",
                tempId = tempId
            )
        }
        s.on("publicAiStreamChunk") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val tempId = obj.optString("tempId")
            if (aiTempId != tempId) return@on
            aiBuilder.append(obj.optString("content"))
            val content = aiBuilder.toString()
            _messages.value = _messages.value.map {
                if (it.tempId == tempId) it.copy(content = content) else it
            }
        }
        s.on("publicAiStreamEnd") { _ ->
            // 终态由 publicMessageBroadcast 广播（含完整消息），移除临时气泡
            removeAiTemp()
        }
        s.on("publicAiStreamError") { _ ->
            val tempId = aiTempId
            if (tempId != null) {
                _messages.value = _messages.value.map {
                    if (it.tempId == tempId) it.copy(content = it.content.ifBlank { "（AI 回复生成失败）" }) else it
                }
            }
            aiTempId = null
        }
        // ===== 私信（与管理员）=====
        s.on("message") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val m = parsePrivate(obj)
            _lastPrivate.value = m
            if (m.id != 0L && _privateMessages.value.none { it.id == m.id }) {
                _privateMessages.value = _privateMessages.value + m
            }
            // App 原生能力：离开消息页时收到私信 → 系统通知（自己的回显/AI 消息不通知）
            val myId = TokenStore.userId.value
            val isMine = m.senderId != 0L && m.senderId == myId
            if (!chatUiVisible && !isMine && !m.fromAi && m.content.isNotBlank()) {
                ChatNotifier.notifyPrivate("收到新私信", m.content)
            }
        }
        s.on("aiStreamEnd") { _ -> /* 私信 AI 流式结束：由 message 事件补全，无需处理 */ }
        // ===== 管理员：在线用户列表 =====
        s.on("userListUpdated") { args ->
            val arr = args.firstOrNull() as? JSONArray ?: return@on
            _userList.value = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::parseChatUser) }
            heartbeatScope.launch { ContentStore.writeChatUsers(_userList.value) }
        }
        s.connect()
    }

    /** 设置页「数据管理」：清空聊天相关的内存态（联动删除磁盘缓存） */
    fun clearLocalData() {
        _messages.value = emptyList()
        _privateMessages.value = emptyList()
        _lastPrivate.value = null
        _userList.value = emptyList()
        _onlineCount.value = 0
        _notice.value = null
    }

    fun send(content: String) {
        val s = socket ?: return
        if (_state.value != ChatConnectionState.CONNECTED) return
        s.emit("publicMessage", content.trim())
    }

    /** 发送私信给管理员 */
    fun sendPrivate(content: String) {
        val s = socket ?: return
        if (_state.value != ChatConnectionState.CONNECTED) return
        s.emit("userMessage", content.trim())
    }

    /** 管理员：回复指定用户 */
    fun sendAdminMessage(userId: Long, content: String) {
        val s = socket ?: return
        if (_state.value != ChatConnectionState.CONNECTED) return
        s.emit("adminMessage", userId, content.trim())
    }

    /** 手动重连：复用现有 socket（保留已注册事件与历史消息），不销毁实例 */
    fun reconnect(token: String?) {
        manuallyClosed = false
        val s = socket
        if (s == null) {
            if (token != null) connect(token)
            return
        }
        if (_state.value != ChatConnectionState.CONNECTED) {
            _state.value = ChatConnectionState.CONNECTING
            s.connect()
        }
    }

    fun disconnect() {
        manuallyClosed = true
        stopHeartbeat()
        socket?.disconnect()
        socket = null
        aiTempId = null
        aiBuilder.setLength(0)
        _messages.value = emptyList()
        _privateMessages.value = emptyList()
        _lastPrivate.value = null
        _userList.value = emptyList()
        _onlineCount.value = 0
        _state.value = ChatConnectionState.DISCONNECTED
    }

    private fun removeAiTemp() {
        val tempId = aiTempId ?: return
        _messages.value = _messages.value.filterNot { it.tempId == tempId }
        aiTempId = null
    }

    private fun parse(obj: JSONObject) = PublicChatMessage(
        id = obj.optLong("id"),
        userId = if (obj.isNull("user_id")) null else obj.optLong("user_id"),
        nickname = obj.optString("nickname", "匿名"),
        avatar = if (obj.isNull("avatar")) null else obj.optString("avatar"),
        content = obj.optString("content"),
        fromAi = obj.optBoolean("from_ai", false),
        timestamp = obj.optString("timestamp", "")
    )

    private fun parsePrivate(obj: JSONObject) = PrivateChatMessage(
        id = obj.optLong("id"),
        senderId = obj.optLong("senderId"),
        receiverId = obj.optLong("receiverId"),
        content = obj.optString("content"),
        timestamp = obj.optString("timestamp", ""),
        isRead = obj.optBoolean("isRead", false),
        toAi = obj.optBoolean("toAi", false),
        fromAi = obj.optBoolean("fromAi", false)
    )

    private fun parseChatUser(obj: JSONObject) = ChatUser(
        id = obj.optLong("id"),
        username = obj.optString("username"),
        nickname = obj.optString("nickname", obj.optString("username")),
        avatar = if (obj.isNull("avatar")) null else obj.optString("avatar"),
        isOnline = obj.optBoolean("isOnline", false)
    )
}