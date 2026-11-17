package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.AdminMonthly
import com.hanphone.blog.data.model.AdminStats
import com.hanphone.blog.data.model.AdminTypeStat
import com.hanphone.blog.data.model.AdminVisitorArea
import com.hanphone.blog.data.model.TagBlogCount
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.util.adminMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 站点概览：四个总量指标 + 按月趋势（阅读/发表/评论/点赞）
 * + 标签/分类分布 + 访客区域分布（对标网页后台同页内容）。
 */
@HiltViewModel
class AdminDashboardViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    /** 指标 key 与后端 /admin/get*ByMonth 一一对应 */
    val metrics = listOf(
        "views" to "阅读量",
        "visits" to "访问量",
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

    // ===== 分布数据（与总量并行加载，失败只影响自己）=====
    var tags by mutableStateOf<List<TagBlogCount>>(emptyList())
        private set
    var types by mutableStateOf<List<AdminTypeStat>>(emptyList())
        private set
    var visitorAreas by mutableStateOf<List<AdminVisitorArea>>(emptyList())
        private set
    var areaLevel by mutableStateOf("country")
        private set

    private var monthlyJob: Job? = null

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                // 四个请求并发：任何一项失败都只影响自身，不阻塞整页
                val statsDeferred = async { runCatching { repo.stats() }.getOrDefault(AdminStats()) }
                val tagsDeferred = async { runCatching { repo.tagsWithCount().data.orEmpty() }.getOrDefault(emptyList()) }
                val typesDeferred = async { runCatching { repo.typeStats() }.getOrDefault(emptyList()) }
                val areasDeferred = async { runCatching { repo.visitorAreas() }.getOrDefault(emptyList()) }
                stats = statsDeferred.await()
                tags = tagsDeferred.await()
                types = typesDeferred.await()
                visitorAreas = areasDeferred.await()
            } catch (e: Exception) {
                error = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
        requestMonthly()
    }

    /** 切换趋势指标（顶部指标卡与 chips 共用） */
    fun selectMetric(key: String) {
        if (key == metric) return
        metric = key
        // 先清空，避免新指标标签下短暂显示上一个指标的数据
        monthly = emptyList()
        requestMonthly()
    }

    /**
     * 月度数据单独请求并带「只认最后一次」的语义：
     * 首屏 refresh 与用户切换指标可能并发，慢的那个响应不能覆盖新指标的数据（2026-11 真机复现）。
     */
    private fun requestMonthly() {
        monthlyJob?.cancel()
        monthlyJob = viewModelScope.launch {
            val requested = metric
            val result = runCatching { repo.monthly(requested) }.getOrDefault(emptyList())
            if (requested == metric) monthly = result
        }
    }

    /** 访客区域维度：country / province */
    fun selectAreaLevel(level: String) {
        if (level == areaLevel) return
        areaLevel = level
    }

    /** 当前维度下按访客数倒序的前 N 条 */
    fun topAreas(limit: Int = 6): List<AdminVisitorArea> =
        visitorAreas.filter { it.level == areaLevel }
            .sortedByDescending { it.visitorCount }
            .take(limit)
}
