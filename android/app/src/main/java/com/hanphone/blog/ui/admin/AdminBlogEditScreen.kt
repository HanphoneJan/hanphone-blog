package com.hanphone.blog.ui.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.hanphone.blog.util.resolveImageUrl
import com.mohamedrejeb.richeditor.model.rememberRichTextState
import com.mohamedrejeb.richeditor.ui.material3.RichText
import com.hanphone.blog.ui.components.ToastMessage

private enum class BodyMode { RICH, SOURCE }

/**
 * 博客编辑页。
 *
 * 正文两种模式：
 * - 富文本（richeditor）：所见即所得，新建默认用这个；
 * - 源码：Markdown 原文，编辑已有文章默认用这个 —— 富文本的 Markdown 往返会重排
 *   表格/围栏代码块，技术文章被静默改写比不好看更糟。
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AdminBlogEditScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    vm: AdminBlogEditViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var mode by remember { mutableStateOf(if (vm.isNew) BodyMode.RICH else BodyMode.SOURCE) }
    val richState = rememberRichTextState()
    // 富文本的 Markdown 往返有损（表格/代码块会被压平），所以记录「载入时的基准」：
    // 保存时只有内容真的被改过才写回，避免只改标题/标签就把正文格式静默改坏。
    var richBaseline by remember { mutableStateOf<String?>(null) }

    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(vm::uploadCover)
    }

    // 进入富文本模式时把 Markdown 灌进编辑器（切换/首次都走这里）
    LaunchedEffect(mode, vm.loading) {
        if (mode == BodyMode.RICH && !vm.loading) {
            richState.setMarkdown(vm.content)
            richBaseline = richState.toMarkdown()
        }
    }

    ToastMessage(vm.message, vm::consumeMessage)
    LaunchedEffect(vm.saved) {
        if (vm.saved) onSaved()
    }

    AdminScaffold(
        title = if (vm.isNew) "新建博客" else "编辑博客",
        onBack = onBack,
        actions = {
            TextButton(
                onClick = {
                    if (mode == BodyMode.RICH) {
                        val current = richState.toMarkdown()
                        if (current != richBaseline) vm.updateContent(current)
                    }
                    vm.save()
                },
                enabled = !vm.saving
            ) {
                if (vm.saving) {
                    CircularProgressIndicator(Modifier.height(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("保存")
                }
            }
        }
    ) {
        if (vm.loading) {
            AdminLoading()
            return@AdminScaffold
        }
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            AdminField(vm.title, vm::updateTitle, "标题", placeholder = "文章标题")
            AdminGap(8)
            AdminField(
                value = vm.description,
                onValueChange = vm::updateDescription,
                label = "摘要",
                singleLine = false,
                minLines = 2,
                placeholder = "列表页展示的简介（≤200 字）"
            )
            AdminGap(10)

            AdminDropdown(
                label = "分类",
                options = vm.types,
                selected = vm.selectedType,
                optionLabel = { it.name },
                onSelect = vm::selectType
            )
            AdminGap(10)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("原创", "转载", "翻译").forEach { f ->
                    AdminChip(f, vm.flag == f) { vm.updateFlag(f) }
                }
            }

            AdminSectionTitle("标签", "已选 ${vm.selectedTagIds.size} 个")
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                vm.tags.forEach { tag ->
                    AdminChip(tag.name, tag.id in vm.selectedTagIds) { vm.toggleTag(tag.id) }
                }
            }

            AdminSectionTitle("封面")
            if (vm.firstPicture != null) {
                Box(Modifier.fillMaxWidth()) {
                    AsyncImage(
                        model = resolveImageUrl(vm.firstPicture!!),
                        contentDescription = "封面",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(10.dp))
                    )
                    Box(
                        Modifier.align(Alignment.TopEnd).padding(6.dp)
                            .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(50))
                            .padding(4.dp)
                            .clickable { vm.clearCover() }
                    ) {
                        Icon(Icons.Filled.Close, "移除封面", tint = Color.White)
                    }
                }
            } else {
                Box(
                    Modifier.fillMaxWidth().aspectRatio(16f / 9f)
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
                        .clickable { coverPicker.launch("image/*") },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        if (vm.uploadingCover) "上传中…" else "点击选择封面图（16:9 自动裁切展示）",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (vm.firstPicture != null) {
                TextButton(onClick = { coverPicker.launch("image/*") }) { Text("更换封面") }
            }

            AdminSectionTitle("正文")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AdminChip("富文本", mode == BodyMode.RICH) {
                    if (mode != BodyMode.RICH) mode = BodyMode.RICH
                }
                AdminChip("源码", mode == BodyMode.SOURCE) {
                    if (mode == BodyMode.RICH) {
                        val current = richState.toMarkdown()
                        // 没编辑过就别回写，保持原 Markdown 一字不差
                        if (current != richBaseline) vm.updateContent(current)
                    }
                    mode = BodyMode.SOURCE
                }
            }
            Text(
                if (mode == BodyMode.RICH) {
                    "富文本的 Markdown 往返会重排表格与代码块，技术文章建议用源码模式。"
                } else {
                    "Markdown 源码，支持表格 / 代码块 / 图片。"
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 6.dp)
            )
            Box(
                Modifier.fillMaxWidth().height(420.dp)
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(10.dp))
                    .padding(10.dp)
            ) {
                if (mode == BodyMode.RICH) {
                    RichText(
                        state = richState,
                        modifier = Modifier.fillMaxSize(),
                        style = MaterialTheme.typography.bodyLarge
                    )
                } else {
                    OutlinedTextField(
                        value = vm.content,
                        onValueChange = vm::updateContent,
                        placeholder = { Text("在这里写 Markdown…") },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            AdminGap(14)
            AdminSwitchRow("立即发布", vm.published, vm::updatePublished, "关闭后保存为草稿")
            AdminSwitchRow("允许评论", vm.commentabled, vm::updateCommentabled)
            if (vm.published) {
                Text(
                    "⚠️ 网页文章详情页是构建期静态化的：保存后正文不会立刻上线，需要重新构建部署 web 前端。",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            AdminGap(28)
        }
    }
}
