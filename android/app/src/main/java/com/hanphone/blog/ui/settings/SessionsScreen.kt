package com.hanphone.blog.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.LoginSession
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.ui.components.ToastMessage
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.util.formatDateTime

/**
 * 登录设备：查看当前账号登录过的设备，下线其他设备。
 *
 * 本机（current）不提供「下线」，避免误触把自己踢掉；
 * 只有本机在服务端已被吊销/过期时才给「退出登录」，走本地清理流程后回「我的」。
 */
@Composable
fun SessionsScreen(
    onBack: () -> Unit,
    onLoggedOut: () -> Unit
) {
    val vm: SessionsViewModel = hiltViewModel()
    val token by TokenStore.token.collectAsState()
    val toast = rememberToast()
    var confirm by remember { mutableStateOf<LoginSession?>(null) }

    // 登录后（或从登录页返回）补一次首载；未登录不发请求
    LaunchedEffect(token) {
        if (token != null) vm.loadIfNeeded()
    }

    // 本机退出完成：提示并回到「我的」（导航在 AppNav 里收两层）
    LaunchedEffect(vm.loggedOut) {
        if (vm.loggedOut) {
            vm.consumeLoggedOut()
            toast("已退出登录")
            onLoggedOut()
        }
    }

    ToastMessage(vm.message, vm::consumeMessage)

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "登录设备", onBack = onBack)

        if (token == null) {
            EmptyBox("请先登录")
        } else {
            PullRefresh(vm, Modifier.weight(1f).fillMaxWidth()) {
                when {
                    vm.loading && vm.items.isEmpty() -> RowListSkeleton(leading = null, contentPadding = 16.dp)
                    vm.error != null && vm.items.isEmpty() -> ErrorBox(vm.error!!, onRetry = { vm.retry() })
                    vm.items.isEmpty() -> EmptyBox("暂无登录设备")
                    else -> LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 12.dp)
                    ) {
                        itemsIndexed(
                            items = vm.items,
                            key = { index, s -> s.sid.ifBlank { "row_$index" } }
                        ) { _, s ->
                            SessionRow(
                                session = s,
                                busy = vm.revoking != null,
                                onRevoke = { confirm = s },
                                onExit = { vm.exitCurrentDevice() }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                        }
                    }
                }
            }
        }
    }

    // 下线二次确认：说明「该设备需重新登录」
    confirm?.let { s ->
        AlertDialog(
            onDismissRequest = { if (vm.revoking == null) confirm = null },
            title = { Text("下线该设备？") },
            text = { Text("「${deviceTitle(s)}」将立即退出登录，需要重新登录才能继续使用。") },
            confirmButton = {
                TextButton(
                    enabled = vm.revoking == null,
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    onClick = {
                        confirm = null
                        vm.revoke(s)
                    }
                ) { Text("下线") }
            },
            dismissButton = {
                TextButton(enabled = vm.revoking == null, onClick = { confirm = null }) { Text("取消") }
            }
        )
    }
}

/** 单台设备：名称 + 徽标 / IP / 时间行 / 失效原因 + 右侧操作 */
@Composable
private fun SessionRow(
    session: LoginSession,
    busy: Boolean,
    onRevoke: () -> Unit,
    onExit: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    deviceTitle(session),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    // 不给 weight 会把后面的徽标量成 0dp（与「推荐」角标同一个坑）
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (session.current) SessionBadge("本机", primary = true)
                when {
                    !session.active -> SessionBadge("已失效", danger = true)
                    !session.current -> SessionBadge("活跃")
                }
            }
            Text(
                "IP ${session.ip?.takeIf { it.isNotBlank() } ?: "未知"}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                metaLine(session),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            revokedLabel(session.revokedReason)?.let { reason ->
                Text(
                    reason,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error.copy(alpha = 0.85f)
                )
            }
        }

        // 本机不给「下线」；本机在服务端已失效时才给「退出登录」（本地清理后回「我的」）
        when {
            session.current && !session.active ->
                TextButton(enabled = !busy, onClick = onExit) {
                    Text("退出登录", style = MaterialTheme.typography.labelMedium)
                }
            session.current -> Unit
            session.active ->
                TextButton(
                    enabled = !busy,
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    onClick = onRevoke
                ) { Text("下线", style = MaterialTheme.typography.labelMedium) }
            else -> Unit
        }
    }
}

@Composable
private fun SessionBadge(text: String, primary: Boolean = false, danger: Boolean = false) {
    val colors = MaterialTheme.colorScheme
    val bg = when {
        primary -> colors.primary.copy(alpha = 0.14f)
        danger -> colors.error.copy(alpha = 0.12f)
        else -> colors.surfaceVariant
    }
    val fg = when {
        primary -> colors.primary
        danger -> colors.error
        else -> colors.onSurfaceVariant
    }
    Surface(shape = RoundedCornerShape(50), color = bg) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = fg,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

/** 设备标题：优先请求头带来的 deviceName，其次 UA 里的机型片段，最后「未知设备」 */
private fun deviceTitle(s: LoginSession): String {
    s.deviceName?.trim()?.takeIf { it.isNotEmpty() }?.let { return it.take(40) }
    val ua = s.userAgent?.trim().orEmpty()
    if (ua.isBlank()) return "未知设备"
    // Mozilla/5.0 (Linux; Android 14; RMX6699 Build/...) … → RMX6699
    val seg = ua.substringAfter('(', "").substringBefore(')')
        .split(';')
        .map { it.substringBefore(" Build").trim() }
        .lastOrNull {
            it.isNotBlank() && !it.startsWith("Linux") && !it.startsWith("Android") &&
                !it.startsWith("wv") && it != "K"
        }
    return (seg ?: ua.substringBefore(' ')).take(32).ifBlank { "未知设备" }
}

/** 第三行：最近使用 / 登录时间 / 到期（缺失用「—」占位，保持三段时间一致） */
private fun metaLine(s: LoginSession): String = buildString {
    append("最近使用 ")
    append(formatDateTime(s.lastUsedAt).ifBlank { "—" })
    append(" / 登录时间 ")
    append(formatDateTime(s.createdAt).ifBlank { "—" })
    append(" / 到期 ")
    append(formatDateTime(s.expiresAt).ifBlank { "—" })
}

/** 吊销原因文案（服务端取值：logout / password_changed / refresh_reused / user_revoked） */
private fun revokedLabel(reason: String?): String? = when (reason?.trim()?.lowercase()) {
    null, "" -> null
    "logout" -> "已退出登录"
    "password_changed", "password" -> "修改密码后失效"
    "refresh_reused", "reuse" -> "登录凭证被重复使用，已强制下线"
    "user_revoked" -> "已被下线"
    else -> "已失效（$reason）"
}
