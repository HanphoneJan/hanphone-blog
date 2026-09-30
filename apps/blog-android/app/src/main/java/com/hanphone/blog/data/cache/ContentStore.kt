package com.hanphone.blog.data.cache

import android.content.Context
import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.SiteStats
import com.squareup.moshi.Types
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.lang.reflect.Type

/**
 * 冷启动内容缓存：把列表/统计数据持久化到私有目录（Moshi + JSON 文件）。
 *
 * 与 [MemoryCache] 的分工：
 * - MemoryCache：进程内存级，页面返回 / Tab 切回时同步读取，零延迟；
 * - ContentStore：磁盘级，**冷启动**（进程重建）后先展示上次内容，再静默刷新。
 *
 * 仅作展示缓存，容量小、可随时丢弃；登录态等敏感数据仍走 DataStore。
 */
object ContentStore {

    private const val DIR = "content_cache"
    private val moshi = ApiClient.moshi

    private lateinit var dir: File

    /** 在 Application.onCreate 中调用 */
    fun init(context: Context) {
        dir = File(context.applicationContext.filesDir, DIR)
        if (!dir.exists()) dir.mkdirs()
    }

    private suspend fun readText(name: String): String? = withContext(Dispatchers.IO) {
        runCatching {
            File(dir, name).takeIf { it.isFile }?.readText()
        }.getOrNull()
    }

    private suspend fun writeText(name: String, text: String): Unit = withContext(Dispatchers.IO) {
        runCatching {
            val tmp = File(dir, "$name.tmp")
            tmp.writeText(text)
            tmp.renameTo(File(dir, name)) // 原子替换，避免写一半崩溃留脏文件
        }.getOrNull() ?: Unit
    }

    private suspend inline fun <reified T> read(name: String, type: Type): T? {
        val text = readText(name) ?: return null
        return runCatching {
            moshi.adapter<T>(type).fromJson(text)
        }.getOrNull()
    }

    private suspend fun write(name: String, type: Type, value: Any?): Unit =
        writeText(name, moshi.adapter<Any>(type).toJson(value))

    // ===== 首页文章流 =====
    private val blogListType: Type = Types.newParameterizedType(List::class.java, Blog::class.java)
    suspend fun readHomeBlogs(): List<Blog>? = read("home_blogs.json", blogListType)
    suspend fun writeHomeBlogs(items: List<Blog>) = write("home_blogs.json", blogListType, items)

    // ===== 随笔动态流（Paging 接管后仅存最近一页，供极端弱网兜底） =====
    private val essayListType: Type = Types.newParameterizedType(List::class.java, Essay::class.java)
    suspend fun readEssayFirstPage(): List<Essay>? = read("essay_first_page.json", essayListType)
    suspend fun writeEssayFirstPage(items: List<Essay>) = write("essay_first_page.json", essayListType, items)

    // ===== 我的页 =====
    suspend fun readSiteStats(): SiteStats? = read("site_stats.json", SiteStats::class.java)
    suspend fun writeSiteStats(stats: SiteStats) = write("site_stats.json", SiteStats::class.java, stats)
    suspend fun readVisitCount(): Long? = read("visit_count.json", Long::class.java)
    suspend fun writeVisitCount(v: Long) = write("visit_count.json", Long::class.java, v)

    // ===== 留言板 / 友链 =====
    private val messageListType: Type = Types.newParameterizedType(List::class.java, Message::class.java)
    suspend fun readBoardMessages(): List<Message>? = read("board_messages.json", messageListType)
    suspend fun writeBoardMessages(items: List<Message>) = write("board_messages.json", messageListType, items)

    private val linkListType: Type = Types.newParameterizedType(List::class.java, FriendLink::class.java)
    suspend fun readFriendLinks(): List<FriendLink>? = read("friend_links.json", linkListType)
    suspend fun writeFriendLinks(items: List<FriendLink>) = write("friend_links.json", linkListType, items)

    // ===== 项目 =====
    private val projectListType: Type = Types.newParameterizedType(List::class.java, Project::class.java)
    suspend fun readProjects(): List<Project>? = read("projects.json", projectListType)
    suspend fun writeProjects(items: List<Project>) = write("projects.json", projectListType, items)

    // ===== 文库 =====
    private val docListType: Type = Types.newParameterizedType(List::class.java, Doc::class.java)
    suspend fun readDocs(): List<Doc>? = read("docs.json", docListType)
    suspend fun writeDocs(items: List<Doc>) = write("docs.json", docListType, items)
}
