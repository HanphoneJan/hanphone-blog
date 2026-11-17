package com.hanphone.blog.data.model

import java.util.Date

/** 后台概览的四个总量指标 */
data class AdminStats(
    val blogCount: Long = 0,
    val viewCount: Long = 0,
    val commentCount: Long = 0,
    val likeCount: Long = 0
)

/**
 * 月度数据点。
 *
 * 后端 `/admin/get*ByMonth` 返回的是 `List<String>`，每项形如 `"2024-01,12"`
 * （网页 `item.split(',')` 解析）。这里在仓库层转换好再给 UI。
 */
data class AdminMonthly(
    val label: String = "",
    val value: Long = 0
)

/** 标签 + 关联文章数（/admin/getFullTagListAndBlogNumber） */
data class TagBlogCount(
    val id: Long = 0,
    val name: String = "",
    val blogsNumber: Long = 0
)

/**
 * 分类分布（/admin/getFullTypeList）。
 *
 * 后端 Type 实体带 `blogs`（完整博客对象），这里只声明 id 用于计数：
 * Moshi 只取 id，其余字段忽略，避免为统计再拉一遍正文。
 */
data class AdminTypeStat(
    val id: Long = 0,
    val name: String = "",
    val color: String? = null,
    val blogs: List<AdminIdRef> = emptyList()
)

data class AdminIdRef(val id: Long = 0)

// ===== 访客统计 =====

/** /admin/visitor/overview */
data class AdminVisitorOverview(
    val uv: Long = 0,
    val pv: Long = 0,
    val unknownRegion: Long = 0,
    val unknownRegionPercent: Double = 0.0
)

/** /admin/visitor/area-list（level = country / province） */
data class AdminVisitorArea(
    val name: String = "",
    val visitorCount: Long = 0,
    val totalVisits: Long = 0,
    val level: String = ""
)

/** /admin/visitor/ip-list 的单行 */
data class AdminVisitorIp(
    val id: Long = 0,
    val ip: String = "",
    val country: String? = null,
    val province: String? = null,
    val city: String? = null,
    val visitCount: Long = 0,
    val lastVisitTime: Date? = null
)

/** Spring Data Page 的裁剪（访客 IP 明细分页） */
data class AdminVisitorPage(
    val content: List<AdminVisitorIp> = emptyList(),
    val totalElements: Long = 0,
    val totalPages: Int = 0,
    val size: Int = 0,
    val number: Int = 0
)

// ===== 聚合数据（admin/hot）=====

/** 一次采集记录（/admin/hot/runs/page） */
data class AdminCollectRun(
    val id: Long = 0,
    val triggerType: String = "",
    val startedAt: Date? = null,
    val finishedAt: Date? = null,
    val totalSources: Int = 0,
    val successCount: Int = 0,
    val failedCount: Int = 0,
    val detail: String? = null
)

data class AdminCollectRunsPage(
    val content: List<AdminCollectRun> = emptyList(),
    val page: Int = 0,
    val size: Int = 0,
    val totalElements: Long = 0,
    val totalPages: Int = 0
)

/** AI 摘要配置（/admin/hot/settings/summary） */
data class AdminSummarySettings(
    val baseUrl: String? = null,
    val model: String? = null,
    val headers: String? = null,
    /** 生效状态：开关打开且配置完整 */
    val enabled: Boolean = false,
    /** 配置是否完整（与开关无关） */
    val configured: Boolean = false,
    /** 启用开关明文（默认 true） */
    val toggleEnabled: Boolean = true,
    val hasApiKey: Boolean = false
)

/** 模型归一重建结果（dryRun=true 时只是预演） */
data class AdminRebuildSummary(
    val dryRun: Boolean = false,
    val totalEntities: Int = 0,
    val groupsMerged: Int = 0,
    val entitiesRemoved: Int = 0,
    val keysChanged: Int = 0,
    val changes: List<AdminRebuildChange> = emptyList()
)

data class AdminRebuildChange(
    val newKey: String = "",
    val keptFrom: String = "",
    val keptName: String = "",
    val removed: List<String> = emptyList()
)
