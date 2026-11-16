package com.hanphone.blog.data.model

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
