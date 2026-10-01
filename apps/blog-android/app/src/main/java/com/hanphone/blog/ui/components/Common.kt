package com.hanphone.blog.ui.components

import android.content.Context
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.hanphone.blog.util.resolveImageUrl
import kotlinx.coroutines.delay

/** 居中加载 */
@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

/** 错误 + 重试 */
@Composable
fun ErrorBox(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Filled.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(36.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 12.dp)
        )
        Button(onClick = onRetry, modifier = Modifier.padding(top = 16.dp)) { Text("重试") }
    }
}

/** 空数据 */
@Composable
fun EmptyBox(message: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
    }
}

/** 头像：有 URL 显图，否则显示首字符。shape 默认圆形，朋友圈可传圆角方形 */
@Composable
fun Avatar(
    url: String?,
    name: String,
    size: Dp = 36.dp,
    modifier: Modifier = Modifier,
    shape: Shape = CircleShape
) {
    val resolved = remember(url) { url?.let { resolveImageUrl(it) } }
    if (resolved != null) {
        AsyncImage(
            model = resolved,
            contentDescription = name,
            modifier = modifier.size(size).clip(shape),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier.then(Modifier.size(size).clip(shape).background(MaterialTheme.colorScheme.primaryContainer)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                name.firstOrNull()?.toString() ?: "匿",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

/** 区块标题 */
@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
    )
}

/** 列表底部加载状态 */
@Composable
fun ListFooter(
    loadingMore: Boolean,
    hasMore: Boolean,
    showText: Boolean,
    mod: Modifier = Modifier
) {
    Box(
        Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp).then(mod),
        contentAlignment = Alignment.Center
    ) {
        when {
            loadingMore -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            showText && !hasMore -> Text(
                "— 已到底啦 —",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}

/** 详情页底部操作项（点赞/评论/分享等）：图标+文字单行紧凑排布，父容器用 SpaceEvenly 分布 */
@Composable
fun BottomActionItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    modifier: Modifier = Modifier
) {
    Row(
        modifier.clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp).then(modifier),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(icon, contentDescription = label, modifier = Modifier.size(20.dp), tint = tint)
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = tint,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/**
 * 紧凑返回栏：替代 M3 TopAppBar（默认 64dp 偏高）的 44dp 行。
 * 子页（项目/文库/留言/友链/设置/详情/登录等）统一使用；含标题与可选右侧动作。
 */
@Composable
fun AppBackBar(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Row(
        modifier.fillMaxWidth().height(44.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(40.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
        }
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        actions()
        Spacer(Modifier.width(8.dp))
    }
}

/**
 * 紧凑搜索条：替代 M3 OutlinedTextField（默认高 56dp 偏大）的 40dp 胶囊。
 * 统一首页外各页搜索体验；跨页面复用（项目/文库/搜索页）。
 */
@Composable
fun SearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default
) {
    Surface(
        modifier = modifier.fillMaxWidth().height(40.dp),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant
    ) {
        Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Search, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Box(Modifier.weight(1f).padding(horizontal = 10.dp), contentAlignment = Alignment.CenterStart) {
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    keyboardOptions = keyboardOptions,
                    keyboardActions = keyboardActions
                )
                if (value.isEmpty()) {
                    Text(
                        placeholder,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (value.isNotEmpty()) {
                IconButton(onClick = { onValueChange("") }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Filled.Close, "清除搜索", Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

/** 收起软键盘 */
fun hideKeyboard(context: Context, view: View) {
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return
    imm.hideSoftInputFromWindow(view.windowToken, 0)
}

/**
 * 键盘弹出时所需底边补偿：(IME - 导航栏) 内边距差值。
 * Scaffold 已统一预留导航栏内边距，若再直接 imePadding 会双重抬升/残留空白；
 * 主 Tab（底部导航）与子页（无底栏）通用：键盘弹出时恰好贴齐键盘顶。
 */
@Composable
fun Modifier.imeLiftAboveKeyboard(): Modifier {
    val density = LocalDensity.current
    val pad = with(density) {
        (WindowInsets.ime.getBottom(this) - WindowInsets.navigationBars.getBottom(this))
            .coerceAtLeast(0)
            .toDp()
    }
    return padding(bottom = pad)
}

/**
 * 底部评论/留言输入条（钉在页面底部，键盘弹出时上浮）：
 * BasicTextField 胶囊 + 发送；左侧/右侧可放操作（如点赞/分享）；
 * 回复目标非空时顶部显示「回复 @xxx ✕」小条。约 44dp 高，替代 M3 弹窗输入。
 */
@Composable
fun CommentInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    sendEnabled: Boolean,
    placeholder: String,
    modifier: Modifier = Modifier,
    replyName: String? = null,
    onCancelReply: () -> Unit = {},
    subtitle: String? = null,
    autoFocus: Boolean = false,
    leading: @Composable RowScope.() -> Unit = {},
    trailing: @Composable RowScope.() -> Unit = {}
) {
    // 轻量底部条：细分割线 + 底色（不用重投影，避免与页面割裂）
    // 键盘弹出时按 (IME - 导航栏) 精确抬升，避免 Scaffold 已做导航栏内边距造成的残差空白
    val focusRequester = remember { FocusRequester() }
    if (autoFocus) {
        // 等一小段让自身布局稳定后再请求焦点并拉起输入法
        LaunchedEffect(Unit) {
            delay(180)
            focusRequester.requestFocus()
        }
    }
    Column(modifier.fillMaxWidth().imeLiftAboveKeyboard()) {
        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
        Surface(color = MaterialTheme.colorScheme.background) {
            Column {
                if (replyName != null) {
                Row(
                    Modifier.fillMaxWidth().padding(start = 16.dp, top = 2.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("回复 @$replyName", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = onCancelReply, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.Close, "取消回复", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.outline)
                    }
                }
            } else if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 16.dp, top = 4.dp)
                )
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                leading()
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(22.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                ) {
                    BasicTextField(
                        value = value,
                        onValueChange = onValueChange,
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester).padding(horizontal = 14.dp, vertical = 10.dp),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { if (sendEnabled) onSend() }),
                        decorationBox = { inner ->
                            Box {
                                if (value.isEmpty()) {
                                    Text(
                                        placeholder,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.outline,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                inner()
                            }
                        }
                    )
                }
                IconButton(onClick = onSend, enabled = sendEnabled, modifier = Modifier.size(40.dp)) {
                    Icon(
                        Icons.Filled.Send,
                        "发送",
                        modifier = Modifier.size(20.dp),
                        tint = if (sendEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                    )
                }
                trailing()
            }
            }
        }
    }
}