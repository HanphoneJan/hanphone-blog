package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.model.AdminMonthly
import com.hanphone.blog.data.model.AdminStats
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 站点概览：四个总量指标 + 按月趋势（阅读/发表/评论/点赞） */
@HiltViewModel
class AdminDashboardViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    /** 指标 key 与后端 /admin/get*ByMonth 一一对应 */
    val metrics = listOf(
        "views" to "阅读量",
        "blogs" to "发表数",
        "comments" to "评论数",
        "likes" to "点赞数"
    )

    var stats by mutableStateOf(AdminStats())
        private set
    var monthly by mutableStateOf<List<AdminMonthly>>(emptyList())
        private set
    var metric by mutableStateOf("views")
        private set
    var loading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                // 三个请求并发：任何一项失败都只影响自身，不阻塞整页
                val statsDeferred = async { runCatching { repo.stats() }.getOrDefault(AdminStats()) }
                val monthlyDeferred = async { runCatching { repo.monthly(metric) }.getOrDefault(emptyList()) }
                stats = statsDeferred.await()
                monthly = monthlyDeferred.await()
            } catch (e: Exception) {
                error = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun selectMetric(key: String) {
        if (key == metric) return
        metric = key
        viewModelScope.launch {
            loading = monthly.isEmpty()
            monthly = runCatching { repo.monthly(key) }.getOrDefault(emptyList())
            loading = false
        }
    }
}
