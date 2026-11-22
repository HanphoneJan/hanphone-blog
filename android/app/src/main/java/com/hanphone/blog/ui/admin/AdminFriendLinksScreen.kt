package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.FlowRowScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.hanphone.blog.data.cache.ImageCaches
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.ui.components.ToastMessage
import com.hanphone.blog.ui.components.Avatar
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.util.parseApplyText

/** 友链审核/维护 */
@Composable
fun AdminFriendLinksScreen(
    onBack: () -> Unit,
    vm: AdminFriendLinksViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<FriendLink?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<FriendLink?>(null) }

    ToastMessage(vm.message, vm::consumeMessage)

    AdminScaffold(
        title = "友链管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } },
        refreshable = vm,
    ) {
        AdminListBody(
            loading = vm.loading,
            list = vm.items,
            emptyText = "还没有友链申请",
            key = { it.id }
        ) { link ->
            FriendLinkRow(
                link = link,
                onEdit = { editing = link },
                onTogglePublished = { vm.togglePublished(link) },
                onToggleRecommend = { vm.toggleRecommend(link) },
                onParseText = { vm.parseAndApply(link) },
                onDelete = { pendingDelete = link }
            )
        }
    }

    if (creating || editing != null) {
        FriendLinkDialog(
            initial = editing,
            vm = vm,
            onDismiss = { creating = false; editing = null },
            onSave = { link -> vm.save(link) { creating = false; editing = null } }
        )
    }

    pendingDelete?.let { link ->
        AdminConfirmDialog(
            title = "删除友链",
            text = "确定删除「${link.name}」？",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(link); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun FriendLinkRow(
    link: FriendLink,
    onEdit: () -> Unit,
    onTogglePublished: () -> Unit,
    onToggleRecommend: () -> Unit,
    onParseText: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 头像固定 34dp；行内只留一个固定宽度的菜单位，头像/文字不会再被操作按钮挤掉
        Avatar(
            url = link.avatar,
            name = link.name,
            size = 34.dp,
            feature = ImageCaches.Feature.FRIEND
        )
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    link.name,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (link.recommend) {
                    AdminStarMark(Modifier.padding(start = 6.dp))
                }
            }
            Text(
                // 后端两个字段都可能被用上（网页申请写 linkUrl、后台表单写 url），哪个有就显示哪个
                link.url.ifBlank { link.linkUrl.orEmpty() }.ifBlank { "（未填写网址）" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            // 申请原文只露一行摘要（详情在编辑弹窗里）；单行省略，不会把右侧菜单挤掉
            val applyPreview = remember(link.applyText) { link.applyText?.let { previewOf(it) } }
            if (!applyPreview.isNullOrBlank()) {
                Text(
                    "申请原文：$applyPreview",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            MetaFlow(modifier = Modifier.padding(top = 3.dp)) {
                AdminBadge(
                    if (link.published == true) "已上线" else "待审核",
                    if (link.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                )
            }
        }
        AdminRowMenu(
            buildList {
                add(
                    AdminMenuAction(
                        label = if (link.published == true) "下线" else "上线",
                        onClick = onTogglePublished
                    )
                )
                add(
                    AdminMenuAction(
                        label = if (link.recommend) "取消推荐" else "设为推荐",
                        onClick = onToggleRecommend
                    )
                )
                if (!link.applyText.isNullOrBlank()) {
                    add(AdminMenuAction(label = "解析文本", onClick = onParseText))
                }
                add(AdminMenuAction(label = "编辑", onClick = onEdit))
                add(AdminMenuAction(label = "删除", onClick = onDelete, destructive = true))
            }
        )
    }
}

/** 申请原文的行内摘要：压平换行后取前 40 字 */
private fun previewOf(text: String): String {
    val flat = text.trim().replace(Regex("\\s+"), " ")
    return if (flat.length > 40) flat.take(40) + "…" else flat
}

/** 行内元信息（徽标）容器：空间不够时换行，而不是把后面的徽标压成一条竖线 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MetaFlow(
    modifier: Modifier = Modifier,
    content: @Composable FlowRowScope.() -> Unit
) {
    FlowRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        content = content
    )
}

@Composable
private fun FriendLinkDialog(
    initial: FriendLink?,
    vm: AdminFriendLinksViewModel,
    onDismiss: () -> Unit,
    onSave: (FriendLink) -> Unit
) {
    val toast = rememberToast()
    var name by remember { mutableStateOf(initial?.name.orEmpty()) }
    var url by remember { mutableStateOf(initial?.url.orEmpty()) }
    var linkUrl by remember { mutableStateOf(initial?.linkUrl.orEmpty()) }
    var description by remember { mutableStateOf(initial?.description.orEmpty()) }
    var avatar by remember { mutableStateOf(initial?.avatar.orEmpty()) }
    var siteshot by remember { mutableStateOf(initial?.siteshot.orEmpty()) }
    var rss by remember { mutableStateOf(initial?.rss.orEmpty()) }
    var color by remember { mutableStateOf(initial?.color.orEmpty()) }
    var nickname by remember { mutableStateOf(initial?.nickname.orEmpty()) }
    var published by remember { mutableStateOf(initial?.published == true) }
    var recommend by remember { mutableStateOf(initial?.recommend ?: false) }

    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            vm.uploadFriendLinkImage(uri, isAvatar = true) { pic ->
                if (pic != null) avatar = pic
            }
        }
    }
    val siteshotPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            vm.uploadFriendLinkImage(uri, isAvatar = false) { pic ->
                if (pic != null) siteshot = pic
            }
        }
    }

    val applyText = initial?.applyText

    // 解析申请原文 → 覆盖当前表单（用户随后还能手改）
    fun applyParsedToForm() {
        val text = applyText ?: return
        val parsed = try {
            parseApplyText(text)
        } catch (e: Exception) {
            toast("解析失败")
            return
        }
        if (parsed.isEmpty) {
            toast("未能从文本中解析出有效字段")
            return
        }
        parsed.name?.let { name = it }
        parsed.url?.let { url = it }
        parsed.linkUrl?.let { linkUrl = it }
        parsed.description?.let { description = it }
        parsed.avatar?.let { avatar = it }
        parsed.siteshot?.let { siteshot = it }
        parsed.rss?.let { rss = it }
        parsed.nickname?.let { nickname = it }
        parsed.color?.let { color = it }
        toast("已填入解析结果，请核对后保存")
    }

    AdminFormDialog(
        title = if (initial == null) "新增友链" else "编辑友链",
        onDismiss = onDismiss,
        onSave = {
            onSave(
                (initial ?: FriendLink(id = 0)).copy(
                    name = name.trim(),
                    url = url.trim(),
                    linkUrl = linkUrl.trim().ifBlank { null },
                    description = description.trim(),
                    avatar = avatar.trim().ifBlank { null },
                    siteshot = siteshot.trim().ifBlank { null },
                    rss = rss.trim().ifBlank { null },
                    color = color.trim().ifBlank { null },
                    nickname = nickname.trim().ifBlank { null },
                    published = published,
                    recommend = recommend,
                    // 编辑不能把申请原文弄丢
                    applyText = initial?.applyText
                )
            )
        }
    ) {
        if (!applyText.isNullOrBlank()) {
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                    Text(
                        "申请原文",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        applyText,
                        style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        // 顺序：heightIn 当视口、verticalScroll 在内（反过来滚不动）
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .fillMaxWidth()
                            .heightIn(max = 120.dp)
                            .verticalScroll(rememberScrollState())
                    )
                    TextButton(onClick = { applyParsedToForm() }) {
                        Text("解析文本填入表单")
                    }
                }
            }
        }
        AdminField(name, { name = it }, "名称")
        AdminField(url, { url = it }, "链接", placeholder = "https://")
        AdminField(linkUrl, { linkUrl = it }, "回访链接", placeholder = "可留空")
        AdminField(description, { description = it }, "简介", singleLine = false, minLines = 2)
        AdminImageField(
            value = avatar,
            onValueChange = { avatar = it },
            label = "头像",
            uploading = vm.uploadingAvatar,
            onPick = { avatarPicker.launch("image/*") },
            round = true
        )
        AdminImageField(
            value = siteshot,
            onValueChange = { siteshot = it },
            label = "站点截图",
            uploading = vm.uploadingSiteshot,
            onPick = { siteshotPicker.launch("image/*") },
            aspectRatio = 16f / 9f
        )
        AdminField(rss, { rss = it }, "RSS 地址", placeholder = "可留空")
        AdminField(nickname, { nickname = it }, "站长昵称", placeholder = "可留空")
        AdminField(color, { color = it }, "主题颜色", placeholder = "可留空，如 #1890ff")
        AdminSwitchRow("上线（审核通过）", published, { published = it })
        AdminSwitchRow("推荐", recommend, { recommend = it })
    }
}

/** 项目维护 */
@Composable
fun AdminProjectsScreen(
    onBack: () -> Unit,
    vm: AdminProjectsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var editing by remember { mutableStateOf<Project?>(null) }
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Project?>(null) }

    ToastMessage(vm.message, vm::consumeMessage)

    AdminScaffold(
        title = "项目管理",
        onBack = onBack,
        actions = { TextButton(onClick = { creating = true }) { Text("新增") } },
        refreshable = vm,
    ) {
        AdminListBody(
            loading = vm.loading,
            list = vm.items,
            emptyText = "还没有项目",
            key = { it.id }
        ) { project ->
            Row(
                Modifier.fillMaxWidth().padding(vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            project.title,
                            style = MaterialTheme.typography.bodyLarge,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        if (project.recommend) {
                            AdminStarMark(Modifier.padding(start = 6.dp))
                        }
                    }
                    MetaFlow(modifier = Modifier.padding(top = 3.dp)) {
                        AdminBadge(typeLabel(project.type), MaterialTheme.colorScheme.secondary)
                        AdminBadge(
                            if (project.published == true) "已发布" else "草稿",
                            if (project.published == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                        )
                    }
                }
                AdminRowMenu(
                    listOf(
                        AdminMenuAction(
                            label = if (project.published == true) "下线" else "发布",
                            onClick = { vm.togglePublished(project) }
                        ),
                        AdminMenuAction(
                            label = if (project.recommend) "取消推荐" else "设为推荐",
                            onClick = { vm.toggleRecommend(project) }
                        ),
                        AdminMenuAction(label = "编辑", onClick = { editing = project }),
                        AdminMenuAction(
                            label = "删除",
                            onClick = { pendingDelete = project },
                            destructive = true
                        )
                    )
                )
            }
        }
    }

    if (creating || editing != null) {
        ProjectDialog(
            initial = editing,
            vm = vm,
            onDismiss = { creating = false; editing = null },
            onSave = { vm.save(it) { creating = false; editing = null } }
        )
    }

    pendingDelete?.let { project ->
        AdminConfirmDialog(
            title = "删除项目",
            text = "确定删除「${project.title}」？",
            confirmText = "删除",
            destructive = true,
            onConfirm = { vm.delete(project); pendingDelete = null },
            onDismiss = { pendingDelete = null }
        )
    }
}

@Composable
private fun ProjectDialog(
    initial: Project?,
    vm: AdminProjectsViewModel,
    onDismiss: () -> Unit,
    onSave: (Project) -> Unit
) {
    var title by remember { mutableStateOf(initial?.title.orEmpty()) }
    var content by remember { mutableStateOf(initial?.content.orEmpty()) }
    var url by remember { mutableStateOf(initial?.url.orEmpty()) }
    var techs by remember { mutableStateOf(initial?.techs.orEmpty()) }
    var picUrl by remember { mutableStateOf(initial?.picUrl.orEmpty()) }
    var type by remember { mutableStateOf(initial?.type ?: 1) }
    var published by remember { mutableStateOf(initial?.published != false) }
    var recommend by remember { mutableStateOf(initial?.recommend ?: false) }

    val picPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            vm.uploadProjectImage(uri) { pic ->
                if (pic != null) picUrl = pic
            }
        }
    }

    AdminFormDialog(
        title = if (initial == null) "新增项目" else "编辑项目",
        onDismiss = onDismiss,
        onSave = {
            onSave(
                (initial ?: Project(id = 0)).copy(
                    title = title.trim(),
                    content = content,
                    url = url.trim().ifBlank { null },
                    techs = techs.trim(),
                    picUrl = picUrl.trim().ifBlank { null },
                    type = type,
                    published = published,
                    recommend = recommend
                )
            )
        }
    ) {
        AdminField(title, { title = it }, "标题")
        AdminField(content, { content = it }, "简介", singleLine = false, minLines = 3)
        AdminField(url, { url = it }, "链接", placeholder = "https://")
        AdminField(techs, { techs = it }, "技术栈", placeholder = "逗号分隔，如：Vue3, Vite")
        AdminImageField(
            value = picUrl,
            onValueChange = { picUrl = it },
            label = "项目封面",
            uploading = vm.uploadingPic,
            onPick = { picPicker.launch("image/*") },
            aspectRatio = 16f / 9f
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(1 to "完整项目", 2 to "工具箱", 3 to "小游戏", 4 to "小练习").forEach { (v, label) ->
                AdminChip(label, type == v) { type = v }
            }
        }
        AdminSwitchRow("发布", published, { published = it })
        AdminSwitchRow("推荐", recommend, { recommend = it })
    }
}

private fun typeLabel(type: Int): String = when (type) {
    1 -> "完整项目"
    2 -> "工具箱"
    3 -> "小游戏"
    4 -> "小练习"
    else -> "其他"
}
