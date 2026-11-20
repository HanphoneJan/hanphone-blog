package com.hanphone.blog.ui.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp

/**
 * 后台列表的三态（骨架 / 空态 / 列表）统一入口。
 * 每行后自动加 [AdminDivider]，分页列表把「加载更多」放在 [footer]。
 */
@Composable
fun <T> AdminListBody(
    loading: Boolean,
    list: List<T>,
    emptyText: String,
    key: ((T) -> Any)? = null,
    footer: (@Composable () -> Unit)? = null,
    row: @Composable (T) -> Unit
) {
    when {
        loading && list.isEmpty() -> AdminLoading()
        list.isEmpty() -> AdminEmpty(emptyText)
        else -> LazyColumn(Modifier.fillMaxWidth()) {
            if (key != null) {
                items(list, key = key) { item ->
                    row(item)
                    AdminDivider()
                }
            } else {
                items(list) { item ->
                    row(item)
                    AdminDivider()
                }
            }
            if (footer != null) item { footer() }
        }
    }
}

/**
 * 复杂行（行内容较长、需要自定义 items/key/footer）时用这个：
 * 只统一「骨架 / 空态 / 列表」三态，列表结构仍写在调用处（里面可继续放 LazyColumn/Column）。
 */
@Composable
fun AdminListFrame(
    loading: Boolean,
    empty: Boolean,
    emptyText: String,
    content: @Composable () -> Unit
) {
    when {
        loading && empty -> AdminLoading()
        empty -> AdminEmpty(emptyText)
        else -> content()
    }
}

/** 分页列表底部：还有下一页时显示「加载更多 / 加载中」 */
@Composable
fun AdminLoadMoreFooter(
    hasMore: Boolean,
    loadingMore: Boolean,
    onLoadMore: () -> Unit
) {
    if (!hasMore) return
    Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
        if (loadingMore) {
            CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
        } else {
            TextButton(onClick = onLoadMore) { Text("加载更多") }
        }
    }
}

/**
 * 后台表单弹窗骨架：标题 + 可滚动的字段区 + 保存/取消。
 * 字段用 [AdminField] / [AdminSwitchRow] 等放在 content 里。
 */
@Composable
fun AdminFormDialog(
    title: String,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    saving: Boolean = false,
    enabled: Boolean = true,
    saveText: String = "保存",
    content: @Composable ColumnScope.() -> Unit
) {
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text(title) },
        text = {
            Column(
                // 顺序：heightIn 在外限制视口、verticalScroll 在内负责滚动（反过来滚不动）
                Modifier
                    .heightIn(max = minOf(420.dp, LocalConfiguration.current.screenHeightDp.dp * 0.6f))
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                content = content
            )
        },
        confirmButton = {
            TextButton(onClick = onSave, enabled = enabled && !saving) {
                Text(if (saving) "保存中…" else saveText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) { Text("取消") }
        }
    )
}
