package com.hanphone.blog.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.hanphone.blog.util.UrlRules
import com.hanphone.blog.util.resolveImageUrl
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.ui.theme.RecommendGold

/**
 * 后台管理页面的通用骨架与控件。
 *
 * 视觉沿用 App 现有规范：44dp 紧凑返回栏（[AppBackBar]）、非卡片化的列表行、
 * 48dp 输入框；不引入网页后台那套桌面端布局。
 */
@Composable
fun AdminScaffold(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    floating: @Composable (() -> Unit)? = null,
    actions: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit = {},
    /** 传入实现 [PullRefreshHost] 的 VM 即启用下拉刷新；列表/概览页统一接 vm */
    refreshable: PullRefreshHost? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Scaffold(
        containerColor = Color.Transparent,
        topBar = {
            Surface(color = MaterialTheme.colorScheme.background) {
                AppBackBar(title = title, onBack = onBack, actions = actions)
            }
        },
        floatingActionButton = { floating?.invoke() }
    ) { padding ->
        if (refreshable != null) {
            PullRefresh(
                host = refreshable,
                modifier = modifier.fillMaxSize().padding(padding)
            ) {
                Column(
                    Modifier.fillMaxSize().padding(horizontal = 12.dp),
                    content = content
                )
            }
        } else {
            Column(
                modifier.fillMaxSize().padding(padding).padding(horizontal = 12.dp),
                content = content
            )
        }
    }
}

/** 入口行：图标 + 标题 + 副标题 + 右箭头（居中管理中心用） */
@Composable
fun AdminEntry(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.primary
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 4.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(34.dp).background(tint.copy(alpha = 0.12f), RoundedCornerShape(9.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(19.dp))
        }
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
            if (subtitle.isNotBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        Text("›", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.outline)
    }
}

/** 小徽标：用于「已发布/草稿/推荐」等状态 */
@Composable
fun AdminBadge(text: String, color: Color = MaterialTheme.colorScheme.primary) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.12f), RoundedCornerShape(4.dp))
            .padding(horizontal = 5.dp, vertical = 1.dp)
    )
}

/**
 * 推荐标记。
 *
 * 以前用 `AdminBadge("推荐")` 这种纯文字徽标：行尾一排 TextButton / IconButton 把内容区挤到
 * 几十 dp 时，文字会被量成 0~几 dp，视觉上就是一条彩色竖杠（还顺带把布局顶乱）。
 * 这里改成**固定尺寸**的星形小图标：不参与文字测量，挤不掉，也比竖杠好看。
 *
 * 颜色固定用 [RecommendGold]（琥珀黄）：早前默认取 `colorScheme.tertiary`，浅色主题下是
 * slate-600，看起来就是一颗「黑星」，和公开页的黄色星星对不上。
 */
@Composable
fun AdminStarMark(
    modifier: Modifier = Modifier,
    color: Color = RecommendGold,
    contentDescription: String = "推荐"
) {
    Box(
        modifier
            .size(18.dp)
            .background(color.copy(alpha = 0.16f), RoundedCornerShape(5.dp)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            Icons.Filled.Star,
            contentDescription = contentDescription,
            tint = color,
            modifier = Modifier.size(12.dp)
        )
    }
}

/** 行尾菜单项 */
data class AdminMenuAction(
    val label: String,
    val onClick: () -> Unit,
    val enabled: Boolean = true,
    val destructive: Boolean = false
)

/**
 * 列表行尾的「⋮」菜单。
 *
 * 后台列表一行最多只能有一个固定宽度的操作位：把「上线/下线、推荐、编辑、删除」全铺成一排
 * TextButton 时，右侧会吃掉 200dp 以上，左边的头像/名称/徽标只能被压扁（头像消失、
 * 推荐徽标变竖杠）。收进菜单后内容区宽度稳定。
 */
@Composable
fun AdminRowMenu(actions: List<AdminMenuAction>) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { expanded = true }) {
            Icon(
                Icons.Filled.MoreVert,
                contentDescription = "更多操作",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            actions.forEach { action ->
                DropdownMenuItem(
                    text = {
                        Text(
                            action.label,
                            color = if (action.destructive) {
                                // 显式给红色时 Material 的 enabled 淡出会被盖掉，禁用态要自己压透明度
                                MaterialTheme.colorScheme.error.copy(
                                    alpha = if (action.enabled) 1f else 0.38f
                                )
                            } else {
                                LocalContentColor.current
                            }
                        )
                    },
                    enabled = action.enabled,
                    onClick = {
                        expanded = false
                        action.onClick()
                    }
                )
            }
        }
    }
}

/** 筛选/选择胶囊 */
@Composable
fun AdminChip(text: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
        contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
        )
    }
}

/** 后台表单输入框：统一 48dp 紧凑高度 */
@Composable
fun AdminField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    minLines: Int = 1,
    placeholder: String? = null,
    keyboardType: androidx.compose.ui.text.input.KeyboardType = androidx.compose.ui.text.input.KeyboardType.Text,
    password: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        singleLine = singleLine,
        minLines = minLines,
        visualTransformation = if (password) {
            androidx.compose.ui.text.input.PasswordVisualTransformation()
        } else {
            androidx.compose.ui.text.input.VisualTransformation.None
        },
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = keyboardType),
        modifier = modifier.fillMaxWidth()
    )
}

/** 开关行 */
@Composable
fun AdminSwitchRow(title: String, checked: Boolean, onChange: (Boolean) -> Unit, subtitle: String = "") {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium)
            if (subtitle.isNotBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

/** 下拉选择（分类、flag、项目类型等） */
@Composable
fun <T> AdminDropdown(
    label: String,
    options: List<T>,
    selected: T?,
    optionLabel: (T) -> String,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable { expanded = true }
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(end = 10.dp)
            )
            Text(
                selected?.let(optionLabel) ?: "未选择",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Icon(Icons.Filled.KeyboardArrowDown, null, modifier = Modifier.size(18.dp))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(optionLabel(option)) },
                    onClick = {
                        expanded = false
                        onSelect(option)
                    }
                )
            }
        }
    }
}

/** 二次确认（删除等破坏性操作统一走这里） */
@Composable
fun AdminConfirmDialog(
    title: String,
    text: String,
    confirmText: String = "确定",
    destructive: Boolean = false,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(text, modifier = Modifier.verticalScroll(rememberScrollState())) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    confirmText,
                    color = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                )
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}

/** 后台列表的空态 */
@Composable
fun AdminEmpty(text: String) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
    }
}

/** 后台列表的加载态 */
@Composable
fun AdminLoading() {
    Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.5.dp)
    }
}

/** 行内细分割线（列表统一用，不画卡片） */
@Composable
fun AdminDivider() {
    HorizontalDivider(
        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f),
        modifier = Modifier.padding(vertical = 2.dp)
    )
}

/** 右侧操作按钮文字（发布/推荐），选中态用主色 */
@Composable
fun AdminTextAction(text: String, active: Boolean, onClick: () -> Unit) {
    TextButton(onClick = onClick) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/** 页面小标题 */
@Composable
fun AdminSectionTitle(text: String, trailing: String? = null) {
    Row(
        Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        if (trailing != null) {
            Text(
                trailing,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/** 垂直留白 */
@Composable
fun AdminGap(height: Int = 8) {
    Spacer(Modifier.height(height.dp))
}


/**
 * 统一图片字段：相册上传 + 手填图片 URL。
 *
 * 后台所有“需要一张图”的字段都应该用它，不要再出现只能上传或只能填 URL 的表单。
 * 预览区的点击与「上传」按钮等价；URL 只在合法 http(s) 时才回写，失焦时提示错误。
 *
 * @param uploading 由调用方 ViewModel 提供，组件本身不持有上传逻辑
 * @param onPick    由调用方启动相册选择器（ActivityResult 必须在 Screen 层注册）
 */
@Composable
fun AdminImageField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    uploading: Boolean,
    onPick: () -> Unit,
    modifier: Modifier = Modifier,
    aspectRatio: Float = 16f / 9f,
    round: Boolean = false,
    placeholder: String = "https://…（可直接粘贴图片地址）",
    hint: String? = "可从相册选择，也可直接填图片地址，二者选其一即可。",
    enabled: Boolean = true
) {
    var draft by remember { mutableStateOf(value) }
    var urlError by remember { mutableStateOf<String?>(null) }
    var broken by remember { mutableStateOf(false) }
    var focused by remember { mutableStateOf(false) }
    // 老数据可能是站内相对路径，别一打开就报「地址无效」；用户改过才校验
    var urlTouched by remember { mutableStateOf(false) }

    // 上传完成 / 外部重置时同步输入框；用户正在输入的等价内容不打断
    LaunchedEffect(value) {
        if (value != draft && UrlRules.normalize(draft) != value) {
            draft = value
            urlError = null
            broken = false
            urlTouched = false
        }
    }

    val preview = if (broken) null else resolveImageUrl(value)

    Column(modifier.fillMaxWidth()) {
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(6.dp))

        Box(
            Modifier
                .then(
                    if (round) Modifier.size(96.dp)
                    else Modifier.fillMaxWidth().aspectRatio(aspectRatio)
                )
                .clip(if (round) CircleShape else RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable(enabled = enabled && !uploading, onClick = onPick),
            contentAlignment = Alignment.Center
        ) {
            if (preview != null) {
                AsyncImage(
                    model = preview,
                    contentDescription = label,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                    onError = { broken = true }
                )
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Filled.Add,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        if (broken) "图片无法加载，可重新上传" else "点击从相册选择",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (uploading) {
                Box(
                    Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = Color.White
                    )
                }
            }

            if (preview != null && !uploading) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .size(26.dp)
                        .background(Color.Black.copy(alpha = 0.55f), CircleShape)
                        .clickable {
                            onValueChange("")
                            draft = ""
                            urlError = null
                            broken = false
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "清除图片",
                        tint = Color.White,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = draft,
            onValueChange = { next ->
                draft = next
                urlTouched = true
                urlError = null
                broken = false
                if (next.isBlank()) {
                    onValueChange("")
                } else if (UrlRules.isHttpUrl(next)) {
                    onValueChange(UrlRules.normalize(next))
                }
            },
            label = { Text("图片 URL") },
            placeholder = { Text(placeholder) },
            isError = urlError != null,
            singleLine = true,
            enabled = enabled,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { state ->
                    if (focused && !state.isFocused) {
                        val raw = draft.trim()
                        urlError = if (urlTouched && raw.isNotEmpty() && !UrlRules.isHttpUrl(raw)) {
                            "请输入 http:// 或 https:// 开头的图片地址"
                        } else {
                            null
                        }
                    }
                    focused = state.isFocused
                }
        )

        urlError?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 4.dp)
            )
        } ?: hint?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
