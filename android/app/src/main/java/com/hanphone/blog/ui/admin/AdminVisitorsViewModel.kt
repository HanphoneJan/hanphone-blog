package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.AdminVisitorIp
import com.hanphone.blog.data.model.AdminVisitorOverview
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.util.adminMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 访客统计（对标网页后台「站点概览」里的全球访客 IP 卡片）：
 * UV/PV 概览 + IP 明细（搜索 / 排序 / 分页）+ 清理。
 */
@HiltViewModel
class AdminVisitorsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel(), PullRefreshHost {

    override val refreshing: Boolean get() = loading

    companion object {
        const val PAGE_SIZE = 20
    }

    var overview by mutableStateOf(AdminVisitorOverview())
        private set
    var items by mutableStateOf<List<AdminVisitorIp>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    var keyword by mutableStateOf("")
        private set
    /** lastVisitTime / visitCount */
    var sortBy by mutableStateOf("lastVisitTime")
        private set
    /** desc / asc */
    var order by mutableStateOf("desc")
        private set
    var page by mutableStateOf(1)
        private set
    var total by mutableStateOf(0L)
        private set
    var totalPages by mutableStateOf(1)
        private set

    private var searchJob: Job? = null

    init {
        refresh()
    }

    override fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                val overviewDeferred = async { runCatching { repo.visitorOverview() }.getOrDefault(AdminVisitorOverview()) }
                val pageDeferred = async { runCatching { loadPage(page) } }
                overview = overviewDeferred.await()
                pageDeferred.await()
            } finally {
                loading = false
            }
        }
    }

    /** 搜索输入：350ms 防抖后回到第一页查询 */
    fun search(value: String) {
        keyword = value
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            page = 1
            reloadPage()
        }
    }

    fun setSort(by: String) {
        if (by == sortBy) return
        sortBy = by
        page = 1
        reloadPage()
    }

    fun toggleOrder() {
        order = if (order == "desc") "asc" else "desc"
        page = 1
        reloadPage()
    }

    fun goPage(target: Int) {
        val safe = target.coerceIn(1, totalPages)
        if (safe == page) return
        page = safe
        reloadPage()
    }

    private fun reloadPage() {
        viewModelScope.launch { loadPage(page) }
    }

    private suspend fun loadPage(target: Int) {
        try {
            val result = repo.visitorIps(keyword, sortBy, order, target, PAGE_SIZE)
            items = result.content
            total = result.totalElements
            totalPages = result.totalPages.coerceAtLeast(1)
            if (result.content.isEmpty() && result.totalPages >= 1 && target > result.totalPages) {
                page = result.totalPages
                loadPage(page)
            }
        } catch (e: Exception) {
            items = emptyList()
            message = e.adminMessage("加载访客数据失败")
        }
    }

    fun clearAll() {
        viewModelScope.launch {
            try {
                val res = repo.clearVisitors()
                if (res.flag) {
                    message = "访客数据已清理"
                    page = 1
                    refresh()
                } else {
                    message = res.message.ifBlank { "清理失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("清理失败")
            }
        }
    }

    fun consumeMessage() { message = null }
}
