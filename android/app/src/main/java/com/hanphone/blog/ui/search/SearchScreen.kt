package com.hanphone.blog.ui.search

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.hanphone.blog.data.model.SearchResultItem
import com.hanphone.blog.ui.components.PullRefresh
import com.hanphone.blog.ui.components.EmptyBox
import com.hanphone.blog.ui.components.ErrorBox
import com.hanphone.blog.ui.components.RowListSkeleton
import com.hanphone.blog.ui.components.SearchField

private fun typeLabel(t: String): String = when (t) {
    "BLOG" -> "博客"
    "ESSAY" -> "随笔"
    "DOC" -> "文档"
    "PROJECT" -> "项目"
    else -> t
}

/** 类型筛选 chips（对齐 web /search 的 TYPE_TABS；null = 全部，其余原值传给服务端） */
private val SEARCH_TYPES: List<Pair<String?, String>> = listOf(
    null to "全部",
    "BLOG" to "博客",
    "ESSAY" to "随笔",
    "PROJECT" to "项目",
    "DOC" to "文档"
)

/** 空结果文案：全部与按类型（博客/随笔/项目/文档）分开说 */
private fun emptyLabel(type: String?): String = when (type) {
    "BLOG" -> "没有找到相关博客"
    "ESSAY" -> "没有找到相关随笔"
    "PROJECT" -> "没有找到相关项目"
    "DOC" -> "没有找到相关文档"
    else -> "没有找到相关内容"
}

/** 全局搜索：博客/随笔/项目/文档，输入即搜（350ms 防抖）+ 类型筛选 */
@Composable
fun SearchScreen(
    onOpenBlog: (Long) -> Unit,
    onOpenEssay: (Long) -> Unit,
    onBack: () -> Unit
) {
    val vm: SearchViewModel = hiltViewModel()
    val uriHandler = LocalUriHandler.current

    val query = vm.query
    val type = vm.type
    val results = vm.results
    val loading = vm.loading
    val error = vm.error
    val searched = vm.searched

    fun open(item: SearchResultItem) {
        when (item.contentType) {
            "BLOG" -> onOpenBlog(item.id)
            "ESSAY" -> onOpenEssay(item.id)
            else -> {
                val url = item.url?.let {
                    if (it.startsWith("http")) it else "https://hanphone.cn$it"
                }
                url?.let { uriHandler.openUri(it) }
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, "返回")
            }
            SearchField(
                value = query,
                onValueChange = { vm.onQueryChange(it) },
                placeholder = "搜索博客 / 随笔 / 文档…",
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onSearch = { vm.submit() })
            )
        }

        // 类型筛选：全部 / 博客 / 随笔 / 项目 / 文档（服务端过滤，选中即以当前关键词重搜）
        Row(
            Modifier.fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(start = 12.dp, end = 12.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            SEARCH_TYPES.forEach { (value, label) ->
                FilterChip(
                    selected = type == value,
                    onClick = { vm.setType(value) },
                    label = { Text(label) }
                )
            }
        }

        PullRefresh(vm, Modifier.weight(1f).fillMaxWidth()) {
            when {
                loading -> RowListSkeleton(count = 8, leading = null, contentPadding = 16.dp)
                error != null -> ErrorBox(error!!, onRetry = { vm.submit() })
                !searched -> EmptyBox("输入关键词，按回车搜索")
                results.isEmpty() -> EmptyBox(emptyLabel(type))
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    items(results, key = { "${it.contentType}-${it.id}" }) { item ->
                        val click: () -> Unit = { open(item) }
                        Surface(onClick = click, modifier = Modifier.fillMaxWidth(), color = androidx.compose.ui.graphics.Color.Transparent) {
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                ) {
                                    Text(
                                        typeLabel(item.contentType),
                                        style = MaterialTheme.typography.labelSmall,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                    Text(item.title, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                                    // 摘要优先用服务端的纯文本 snippet（关键词上下文），没给再回退 description
                                    val summary = item.snippet?.takeIf { it.isNotBlank() } ?: item.description
                                    if (!summary.isNullOrBlank()) {
                                        Text(
                                            summary,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 2,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    }
                }
            }
        }
    }
}