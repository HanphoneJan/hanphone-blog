package com.hanphone.blog.ui.projects

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 项目页：一次拉全量公开项目（后端已过滤 type=0），
 * 前端按 type 分组 + 推荐排序（与 web ProjectClient 一致）。
 * 三层缓存：MemoryCache → ContentStore → 网络静默刷新。
 */
@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel() {

    var projects by mutableStateOf(MemoryCache.projects ?: emptyList())
        private set
    var loading by mutableStateOf(MemoryCache.projects == null)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    /** 当前筛选类型：null = 全部（对应 web 的「全部」筛选） */
    var activeType by mutableStateOf<Int?>(null)
        private set

    /** 搜索关键词（对应 web ProjectClient 的标题/内容/技术栈搜索） */
    var query by mutableStateOf("")
        private set

    /** 推荐在前（稳定排序，保留后端 id 倒序），再按类型筛选 + 关键词过滤 */
    val filtered: List<Project>
        get() {
            val sorted = projects.sortedWith(compareByDescending { it.recommend })
            val byType = if (activeType == null) sorted else sorted.filter { it.type == activeType }
            val q = query.trim().lowercase()
            return if (q.isEmpty()) byType else byType.filter {
                it.title.lowercase().contains(q) ||
                    it.content.lowercase().contains(q) ||
                    it.techs.lowercase().contains(q)
            }
        }

    init {
        // 冷启动：先读磁盘缓存展示，再静默刷新
        viewModelScope.launch {
            val cached = ContentStore.readProjects()
            if (cached != null && projects.isEmpty()) {
                projects = cached
                loading = false
            }
        }
        // 首次加载
        refresh()
    }

    fun setType(type: Int?) {
        activeType = type
    }

    fun onQueryChange(q: String) {
        query = q
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            try {
                val res = repo.projects()
                if (res.flag) {
                    projects = res.data ?: emptyList()
                    MemoryCache.projects = projects
                    ContentStore.writeProjects(projects)
                    error = null
                } else error = res.message.ifBlank { "加载失败" }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
            refreshing = false
        }
    }
}