package com.hanphone.blog.ui.chat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.util.resolveImageUrl
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * 聊天列表展示层（对齐微信/QQ/Telegram 交互习惯）：
 * - 连续同发送者、同 AI 属性、间隔 ≤5 分钟的消息自动成组（气泡贴合、时间只在组末显示、昵称只在组首显示）
 * - 跨天插入日期胶囊（今天 / 昨天 / X月X日[跨年带年份]）；同日间隔 >5 分钟插入居中时间分隔
 */
internal sealed interface ChatItem {
    val key: String
    data class DateDivider(override val key: String, val text: String) : ChatItem
    data class TimeDivider(override val key: String, val text: String) : ChatItem
    data class Msg(
        override val key: String,
        val content: String,
        val mine: Boolean,
        val fromAi: Boolean,
        val nickname: String,
        val avatar: String?,
        val timestamp: String,
        val groupStart: Boolean,
        val groupEnd: Boolean,
        val showRead: Boolean = false
    ) : ChatItem
}

/** 统一的聊天消息中间态（公共聊天室 / 私信共用） */
internal data class ChatMsgLike(
    val key: String,
    val content: String,
    val senderId: Long,
    val fromAi: Boolean,
    val nickname: String,
    val avatar: String?,
    val timestamp: String,
    val mine: Boolean,
    val showRead: Boolean,
    val forceGroupStart: Boolean = false
)

/** 相邻消息间隔超过该时长 → 拆新组并插入时间分隔（与 Web 端一致） */
private const val GROUP_GAP_MS = 5 * 60 * 1000L

internal fun buildChatItems(msgs: List<ChatMsgLike>): List<ChatItem> {
    val items = mutableListOf<ChatItem>()
    var prev: ChatMsgLike? = null
    var lastMsgIndex = -1 // items 中最后一条 Msg 的下标（用于补 groupEnd）

    msgs.forEach { m ->
        val p = prev
        var groupStart = p == null
        if (p != null) {
            val curTime = parseIso(m.timestamp)
            val prevTime = parseIso(p.timestamp)
            val isNewDay = curTime != null && prevTime != null && !isSameDay(curTime, prevTime)
            val isBigGap = curTime != null && prevTime != null && curTime.time - prevTime.time > GROUP_GAP_MS
            val newGroup =
                p.mine != m.mine || p.senderId != m.senderId || p.fromAi != m.fromAi ||
                    isBigGap || isNewDay || m.forceGroupStart

            if (isNewDay) {
                items.add(ChatItem.DateDivider("date_${m.key}", dateLabel(curTime!!)))
            } else if (isBigGap) {
                items.add(ChatItem.TimeDivider("time_${m.key}", formatTime(m.timestamp)))
            }
            if (newGroup && lastMsgIndex >= 0) {
                items[lastMsgIndex] = (items[lastMsgIndex] as ChatItem.Msg).copy(groupEnd = true)
            }
            groupStart = newGroup
        }
        items.add(ChatItem.Msg(
            key = "msg_${m.key}",
            content = m.content,
            mine = m.mine,
            fromAi = m.fromAi,
            nickname = m.nickname,
            avatar = m.avatar,
            timestamp = m.timestamp,
            groupStart = groupStart,
            groupEnd = false,
            showRead = m.showRead
        ))
        lastMsgIndex = items.size - 1
        prev = m
    }
    // 列表末尾的组末条
    if (lastMsgIndex >= 0) {
        items[lastMsgIndex] = (items[lastMsgIndex] as ChatItem.Msg).copy(groupEnd = true)
    }
    return items
}

/** 日期分隔（胶囊）/ 时间分隔（无背景小字），居中展示 */
@Composable
internal fun ChatDivider(item: ChatItem) {
    when (item) {
        is ChatItem.DateDivider -> Box(Modifier.fillMaxWidth().padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
            Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                Text(
                    item.text,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
                )
            }
        }
        is ChatItem.TimeDivider -> Box(Modifier.fillMaxWidth().padding(vertical = 6.dp), contentAlignment = Alignment.Center) {
            Text(item.text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        }
        is ChatItem.Msg -> Unit
    }
}

/** 聊天气泡：我的靠右（primaryContainer，头像在右），他人靠左，AI 特殊色。
 *  组内贴合（相邻圆角收小）、昵称仅组首显示、时间/已读仅组末显示（对齐微信/QQ/Telegram）。 */
@Composable
internal fun MessageBubble(
    content: String,
    mine: Boolean,
    fromAi: Boolean,
    nickname: String,
    avatar: String?,
    timestamp: String,
    myAvatar: String? = null,
    showRead: Boolean = false,
    groupStart: Boolean = true,
    groupEnd: Boolean = true,
    modifier: Modifier = Modifier
) {
    val bg = when {
        fromAi -> MaterialTheme.colorScheme.tertiaryContainer
        mine -> MaterialTheme.colorScheme.primaryContainer
        else -> MaterialTheme.colorScheme.surfaceContainerHigh
    }
    val fg = when {
        fromAi -> MaterialTheme.colorScheme.onTertiaryContainer
        mine -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }
    // 圆角：组首保留原有"尾巴"圆角、组中贴合处收小、组末收底
    val topStart = when {
        mine && groupStart -> 16.dp
        !mine && groupStart -> 4.dp
        else -> 6.dp
    }
    val topEnd = when {
        !mine && groupStart -> 16.dp
        mine && groupStart -> 4.dp
        else -> 6.dp
    }
    val bottomStart = if (groupEnd) 16.dp else 6.dp
    val bottomEnd = if (groupEnd) 16.dp else 6.dp

    Row(modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        if (!mine) {
            Avatar(url = if (fromAi) resolveImageUrl(avatar) else avatar, name = nickname, size = 32.dp, modifier = Modifier.padding(end = 8.dp))
        }
        Box(Modifier.weight(1f, fill = false)) {
            Column(
                horizontalAlignment = if (mine) Alignment.End else Alignment.Start,
                modifier = Modifier.widthIn(max = 300.dp).then(if (mine) Modifier.align(Alignment.CenterEnd) else Modifier.align(Alignment.CenterStart))
            ) {
                // 昵称：仅组首（他人消息）显示
                if (!mine && groupStart) Text(nickname, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Surface(
                    shape = RoundedCornerShape(topStart = topStart, topEnd = topEnd, bottomStart = bottomStart, bottomEnd = bottomEnd),
                    color = bg,
                    contentColor = fg,
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text(content, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                }
                // 时间/已读：仅组末显示
                if (groupEnd && (timestamp.isNotBlank() || showRead)) {
                    Row(Modifier.padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        if (showRead) {
                            Text("已读", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                        if (timestamp.isNotBlank()) {
                            Text(formatTime(timestamp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                }
            }
        }
        if (mine) {
            Avatar(url = resolveImageUrl(myAvatar), name = "我", size = 32.dp, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

internal fun formatTime(iso: String): String {
    val p = parseIso(iso) ?: return ""
    return SimpleDateFormat("HH:mm", Locale.getDefault()).format(p)
}

/** 聊天消息的 ISO 时间解析（兼容毫秒带时区 / Zulu 两种格式） */
private fun parseIso(iso: String): Date? {
    if (iso.isBlank()) return null
    return try {
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).parse(iso)
    } catch (e: Exception) {
        try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(iso.replace("Z", ""))
        } catch (e2: Exception) { null }
    }
}

private fun isSameDay(a: Date, b: Date): Boolean {
    val ca = Calendar.getInstance().apply { time = a }
    val cb = Calendar.getInstance().apply { time = b }
    return ca.get(Calendar.YEAR) == cb.get(Calendar.YEAR) &&
        ca.get(Calendar.DAY_OF_YEAR) == cb.get(Calendar.DAY_OF_YEAR)
}

/** 日期胶囊文案：今天 / 昨天 / X月X日（跨年带年份） */
private fun dateLabel(d: Date): String {
    val today = Calendar.getInstance()
    val that = Calendar.getInstance().apply { time = d }
    val startOfToday = Calendar.getInstance().apply {
        clear()
        set(today.get(Calendar.YEAR), today.get(Calendar.MONTH), today.get(Calendar.DAY_OF_MONTH))
    }
    val startOfThat = Calendar.getInstance().apply {
        clear()
        set(that.get(Calendar.YEAR), that.get(Calendar.MONTH), that.get(Calendar.DAY_OF_MONTH))
    }
    val days = ((startOfThat.timeInMillis - startOfToday.timeInMillis) / 86_400_000L).toInt()
    return when {
        days == 0 -> "今天"
        days == 1 -> "昨天"
        that.get(Calendar.YEAR) == today.get(Calendar.YEAR) ->
            SimpleDateFormat("M月d日", Locale.CHINESE).format(d)
        else -> SimpleDateFormat("yyyy年M月d日", Locale.CHINESE).format(d)
    }
}