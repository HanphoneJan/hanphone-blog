package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.util.adminMessage
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** 后台分页数据：一次性列表用默认值即可（page=1, totalPages=1） */
data class AdminPage<T>(
    val items: List<T>,
    val page: Int = 1,
    val totalPages: Int = 1
)

/**
 * 后台列表 ViewModel 的公共状态与加载流程。
 *
 * 首载 / 下拉刷新 / 加载更多 / 搜索防抖 / 错误提示只写这一份，子类只需要：
 * 1. 实现 [fetchPage]（把接口结果转成 [AdminPage]）；
 * 2. 在 init 末尾调用 [start]（不能放基类 init：那时子类注入的 repo 还没赋值）；
 * 3. 增删改操作成功后直接改 [items] / 用 [notify] 提示。
 *
 * @param paged 是否分页；一次性列表（文库/友链/标签…）传 false，loadMore 无效
 * @param remoteSearch 输入是否触发重新请求（带 350ms 防抖）；false 时只更新 keyword，由页面本地过滤
 */
abstract class AdminListViewModel<T>(
    private val paged: Boolean = true,
    private val remoteSearch: Boolean = false
) : ViewModel(), PullRefreshHost {

    var items by mutableStateOf<List<T>>(emptyList())
        protected set
    var keyword by mutableStateOf("")
        protected set
    var page by mutableStateOf(1)
        protected set
    var totalPages by mutableStateOf(1)
        protected set
    var loading by mutableStateOf(true)
        protected set
    var loadingMore by mutableStateOf(false)
        protected set
    var message by mutableStateOf<String?>(null)
        protected set

    override val refreshing: Boolean get() = loading

    val hasMore: Boolean get() = paged && page < totalPages

    private var searchJob: Job? = null

    /** 拉取指定页数据；一次性列表忽略 page，把全量放进 items */
    protected abstract suspend fun fetchPage(page: Int, keyword: String): AdminPage<T>

    protected fun start() {
        load(reset = true)
    }

    override fun refresh() = load(reset = true)

    fun loadMore() {
        if (!hasMore || loading || loadingMore) return
        load(reset = false)
    }

    fun search(value: String) {
        keyword = value
        if (!remoteSearch) return
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            load(reset = true)
        }
    }

    protected fun notify(text: String) {
        message = text
    }

    fun consumeMessage() {
        message = null
    }

    private fun load(reset: Boolean) {
        viewModelScope.launch {
            if (reset) loading = true else loadingMore = true
            try {
                val target = if (paged && !reset) page + 1 else 1
                val data = fetchPage(target, keyword.trim())
                items = if (reset) data.items else items + data.items
                page = data.page
                totalPages = if (paged) data.totalPages.coerceAtLeast(data.page) else 1
            } catch (e: Exception) {
                message = e.adminMessage(if (reset) "加载失败" else "加载更多失败")
            } finally {
                loading = false
                loadingMore = false
            }
        }
    }
}
