package com.hanphone.blog.data.cache

import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.SiteStats

/**
 * 会话级内存缓存（进程存活期间有效）：
 * - 列表页返回 / Tab 切回时先用缓存立即渲染，再后台静默刷新；
 * - 详情页重复进入直接命中缓存秒开。
 * 仅作展示缓存，不做持久化，登录态等敏感数据仍走 DataStore。
 */
object MemoryCache {

    // ===== 首页文章流（默认「全部·最新」视角；筛选切换不写入） =====
    var homeBlogs: List<Blog>? = null
    var homePage: Int = 1
    var homeTotalPages: Int = 1

    // ===== 随笔动态流 =====
    var essayMoments: List<Essay>? = null
    var essayPage: Int = 1
    var essayTotalPages: Int = 1

    // ===== 我的页（站点统计 / 访问量） =====
    var siteStats: SiteStats? = null
    var visitCount: Long? = null

    // ===== 留言板 / 友链 / 项目 / 文库 =====
    var boardMessages: List<Message>? = null
    var friendLinks: List<FriendLink>? = null
    var projects: List<Project>? = null
    var docs: List<Doc>? = null

    // ===== 详情缓存（LRU，最多 12 篇） =====
    private const val MAX_DETAILS = 12

    private val articleDetails = object : LinkedHashMap<Long, Blog>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Long, Blog>) = size > MAX_DETAILS
    }

    private val essayDetails = object : LinkedHashMap<Long, Essay>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Long, Essay>) = size > MAX_DETAILS
    }

    fun articleDetail(id: Long): Blog? = articleDetails[id]

    fun putArticleDetail(id: Long, blog: Blog) {
        articleDetails[id] = blog
    }

    fun essayDetail(id: Long): Essay? = essayDetails[id]

    fun putEssayDetail(id: Long, essay: Essay) {
        essayDetails[id] = essay
    }
}
