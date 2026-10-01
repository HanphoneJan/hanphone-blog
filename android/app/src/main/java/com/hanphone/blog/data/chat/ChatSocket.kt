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
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

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

    /**
     * 私信会话历史内存缓存（单例常驻）：消息页 Tab 切换/收件箱进出不再重建即丢，
     * 进入会话先吃内存缓存秒显；REST 历史按 30s 节流刷新，避免重复拉取。
     * key：普通用户与管理员 "admin"、管理员与某用户 "u{userId}"（与 ContentStore 一致）。
     */
    private val privateHistoryCache = ConcurrentHashMap<String, List<PrivateChatMessage>>()
    private val privateFetchedAt = ConcurrentHashMap<String, Long>()
    private const val PRIVATE_REFRESH_MS = 30_000L

    /**
     * 私信缓存修订号：conversationRead 已读回执更新缓存时自增一次。
     * UI 收集后在 remember 依赖里带上，收到"对方已读"回执后能即时刷新已读标记。
     */
    private val _privateCacheRevision = MutableStateFlow(0L)
    val privateCacheRevision: StateFlow<Long> = _privateCacheRevision

    /** 管理员收件箱未读数（userId → 未读条数），REST /users/unread + socket 实时增量维护 */
    private val _adminUnread = MutableStateFlow<Map<Long, Int>>(emptyMap())
    val adminUnread: StateFlow<Map<Long, Int>> = _adminUnread
    private val unreadFetchedAt = AtomicLong(0L)
    private const val UNREAD_REFRESH_MS = 60_000L

    /** 当前正在查看的会话对方 ID（null = 不在会话；决定新消息计入未读还是即时标记已读） */
    @Volatile
    var activeConversationUserId: Long? = null

    /** 进入会话时取内存缓存（无则 null，由页面兜底读磁盘缓存） */
    fun restorePrivateHistory(key: String): List<PrivateChatMessage>? = privateHistoryCache[key]

    /** REST/磁盘结果写入内存缓存；fromRemote=true 才记录拉取时间（磁盘恢复不延迟下次 REST） */
    fun cachePrivateHistory(key: String, messages: List<PrivateChatMessage>, fromRemote: Boolean = false) {
        if (messages.isEmpty()) return
        privateHistoryCache[key] = messages
        if (fromRemote) privateFetchedAt[key] = System.currentTimeMillis()
    }

    /** 是否需要重新拉 REST 历史：无缓存 / 超过节流窗口 / 被 markPrivateDirty 强制 */
    fun needsPrivateRefresh(key: String): Boolean {
        val last = privateFetchedAt[key] ?: return true
        return System.currentTimeMillis() - last > PRIVATE_REFRESH_MS
    }

    /** 发送私信后标记该会话需要服务端确认（乐观消息由一次 REST 刷新替换） */
    fun markPrivateDirty(key: String) {
        privateFetchedAt.remove(key)
    }

    /** 管理员收件箱：REST /users/all 全量列表（与 socket 在线态分离），60s 节流 */
    private val _adminUsers = MutableStateFlow<List<ChatUser>>(emptyList())
    val adminUsers: StateFlow<List<ChatUser>> = _adminUsers
    private val usersFetchedAt = AtomicLong(0L)
    private const val USERS_REFRESH_MS = 60_000L

    /** 合并 REST 全量用户进 adminUsers（保留当前在线标记）；fromRemote=true 记录节流时间 */
    fun cacheAdminUsers(users: List<ChatUser>, fromRemote: Boolean = false) {
        if (users.isEmpty()) return
        if (fromRemote) usersFetchedAt.set(System.currentTimeMillis())
        val onlines = _userList.value.associateBy { it.id }
        _adminUsers.value = users.map { u -> onlines[u.id]?.let { u.copy(isOnline = true) } ?: u }
    }

    fun needsUsersRefresh(): Boolean {
        val now = System.currentTimeMillis()
        return _adminUsers.value.isEmpty() || now - usersFetchedAt.get() > USERS_REFRESH_MS
    }

    /** 管理员收件箱未读数：REST 结果合并进 adminUnread；fromRemote=true 记录节流时间 */
    fun cacheAdminUnread(list: List<ChatUnreadItem>, fromRemote: Boolean = false) {
        if (fromRemote) unreadFetchedAt.set(System.currentTimeMillis())
        // REST 以 DB 为权威（未读消息 is_read=false 已在库），直接替换；保留 0 也清除旧计数
        val merged = LinkedHashMap<Long, Int>()
        list.forEach { item -> if (item.count > 0) merged[item.userId] = item.count }
        _adminUnread.value = merged
    }

    fun needsUnreadRefresh(): Boolean {
        val now = System.currentTimeMillis()
        return _adminUnread.value.isEmpty() || now - unreadFetchedAt.get() > UNREAD_REFRESH_MS
    }

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
            // 已读回执/未读数：非自己发出的消息
            val myId = TokenStore.userId.value
            val isMine = m.senderId != 0L && m.senderId == myId
            if (!isMine && m.id != 0L) {
                val peerId = m.senderId
                if (activeConversationUserId == peerId) {
                    // 正在查看该会话 → 立即标记已读（对方收到回执），不累计未读
                    runCatching { s.emit("markConversationRead", peerId) }
                    _adminUnread.value = _adminUnread.value - peerId
                } else {
                    val cur = _adminUnread.value[peerId] ?: 0
                    _adminUnread.value = _adminUnread.value + (peerId to (cur + 1))
                }
            }
            // App 原生能力：离开消息页时收到私信 → 系统通知（自己的回显/AI 消息不通知）
            if (!chatUiVisible && !isMine && !m.fromAi && m.content.isNotBlank()) {
                ChatNotifier.notifyPrivate("收到新私信", m.content)
            }
        }
        // 已读回执：对方读了你发出的消息 → 把自己发出的旧消息标记已读
        s.on("conversationRead") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val peerUserId = obj.optLong("peerUserId")
            val readUpTo = obj.optLong("readUpToMessageId")
            if (peerUserId <= 0) return@on
            markOwnSentRead(peerUserId, readUpTo = readUpTo)
        }
        s.on("aiStreamEnd") { _ -> /* 私信 AI 流式结束：由 message 事件补全，无需处理 */ }
        // ===== 管理员：在线用户列表 =====
        s.on("userListUpdated") { args ->
            val arr = args.firstOrNull() as? JSONArray ?: return@on
            val online = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::parseChatUser) }
            _userList.value = online
            // 同步在线标记到全量列表（在线的置 true，离线保留原值）
            val onlineIds = online.map { it.id }.toSet()
            _adminUsers.value = _adminUsers.value.map { if (it.id in onlineIds) it.copy(isOnline = true) else it }
            heartbeatScope.launch { ContentStore.writeChatUsers(_adminUsers.value) }
        }
        s.connect()
    }

    /** 设置页「数据管理」：清空聊天相关的内存态（联动删除磁盘缓存） */
    fun clearLocalData() {
        _messages.value = emptyList()
        _privateMessages.value = emptyList()
        _lastPrivate.value = null
        _userList.value = emptyList()
        _adminUsers.value = emptyList()
        _adminUnread.value = emptyMap()
        _onlineCount.value = 0
        _notice.value = null
        privateHistoryCache.clear()
        privateFetchedAt.clear()
        usersFetchedAt.set(0L)
        unreadFetchedAt.set(0L)
        _privateCacheRevision.value++
        activeConversationUserId = null
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

    /**
     * 进入会话标记已读：通知服务端把「对方发给本人」的消息置已读并回执给对方；
     * 本地同步清零该会话未读、并把本人已发出的历史置已读（断线时由 REST 历史 isRead 兜底）。
     */
    fun markConversationRead(peerUserId: Long) {
        if (peerUserId <= 0) return
        val s = socket
        if (s != null && _state.value == ChatConnectionState.CONNECTED) {
            runCatching { s.emit("markConversationRead", peerUserId) }
        }
        _adminUnread.value = _adminUnread.value - peerUserId
        markOwnSentRead(peerUserId, readUpTo = Long.MAX_VALUE)
    }

    /**
     * 把发给 peerUserId 且 id <= readUpTo 的本人消息标记已读。
     * 更新私信缓存 + admin 会话 StateFlow；bump 修订号让会话页即时刷新。
     */
    private fun markOwnSentRead(peerUserId: Long, readUpTo: Long) {
        if (readUpTo <= 0) return
        val myId = TokenStore.userId.value ?: return
        val key = if (peerUserId == 1000L) "admin" else "u$peerUserId"
        val cache = privateHistoryCache[key] ?: return
        var changed = false
        val updated = cache.map {
            if (!it.isRead && it.senderId == myId && it.receiverId == peerUserId && it.id in 1..readUpTo) {
                changed = true
                it.copy(isRead = true)
            } else it
        }
        if (changed) {
            privateHistoryCache[key] = updated
            _privateCacheRevision.value++
            if (key == "admin") {
                _privateMessages.value = updated
                _lastPrivate.value = updated.lastOrNull() ?: _lastPrivate.value
            }
        }
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
        _adminUsers.value = emptyList()
        _adminUnread.value = emptyMap()
        _onlineCount.value = 0
        _state.value = ChatConnectionState.DISCONNECTED
        privateHistoryCache.clear()
        privateFetchedAt.clear()
        usersFetchedAt.set(0L)
        unreadFetchedAt.set(0L)
        activeConversationUserId = null
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
        isOnline = obj.optBoolean("isOnline", false),
        lastSeenAt = if (obj.has("lastSeenAt") && !obj.isNull("lastSeenAt")) obj.optLong("lastSeenAt") else null
    )
}