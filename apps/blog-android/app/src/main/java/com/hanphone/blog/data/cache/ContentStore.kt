package com.hanphone.blog.data.cache

import android.content.Context
import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.chat.ChatUser
import com.hanphone.blog.data.chat.PrivateChatMessage
import com.hanphone.blog.data.chat.PublicChatMessage
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Comment
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.Essay
import com.hanphone.blog.data.model.EssayComment
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.Message
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.SiteStats
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type as BlogType
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

    // ===== 首页筛选元数据（分类/标签）+ 归档（筛选面板与归档视图复用，冷启动秒显）=====
    private val typeListType: Type = Types.newParameterizedType(List::class.java, BlogType::class.java)
    suspend fun readTypes(): List<BlogType>? = read("types.json", typeListType)
    suspend fun writeTypes(items: List<BlogType>) = write("types.json", typeListType, items)

    private val tagListType: Type = Types.newParameterizedType(List::class.java, Tag::class.java)
    suspend fun readTags(): List<Tag>? = read("tags.json", tagListType)
    suspend fun writeTags(items: List<Tag>) = write("tags.json", tagListType, items)

    private val archiveType: Type = Types.newParameterizedType(
        Map::class.java, String::class.java, List::class.java, Blog::class.java
    )
    suspend fun readArchive(): Map<String, List<Blog>>? = read("archive.json", archiveType)
    suspend fun writeArchive(map: Map<String, List<Blog>>) = write("archive.json", archiveType, map)

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

    // ===== 随笔评论（列表内嵌评论冷启动秒显；与随笔详情共享同一键）=====
    private val essayCommentsType: Type = Types.newParameterizedType(List::class.java, EssayComment::class.java)
    suspend fun readEssayComments(essayId: Long): List<EssayComment>? = read("essay_comments_$essayId.json", essayCommentsType)
    suspend fun writeEssayComments(essayId: Long, items: List<EssayComment>) = write("essay_comments_$essayId.json", essayCommentsType, items)

    // ===== 文章详情 + 评论（冷启动进入详情秒显，正文/评论分别落盘）=====
    suspend fun readArticleDetail(id: Long): Blog? = read("article_$id.json", Blog::class.java)
    suspend fun writeArticleDetail(id: Long, blog: Blog) = write("article_$id.json", Blog::class.java, blog)

    private val articleCommentsType: Type = Types.newParameterizedType(List::class.java, Comment::class.java)
    suspend fun readArticleComments(id: Long): List<Comment>? = read("article_comments_$id.json", articleCommentsType)
    suspend fun writeArticleComments(id: Long, items: List<Comment>) = write("article_comments_$id.json", articleCommentsType, items)

    // ===== 随笔详情（冷启动进入详情秒显）=====
    suspend fun readEssayDetail(id: Long): Essay? = read("essay_$id.json", Essay::class.java)
    suspend fun writeEssayDetail(id: Long, essay: Essay) = write("essay_$id.json", Essay::class.java, essay)

    // ===== 文库文档原文（MD 预览 / HTML WebView 的 fetch 文本；TTL 防重复下载）=====
    suspend fun readRawText(name: String, maxAgeMs: Long = 0L): String? = withContext(Dispatchers.IO) {
        val f = File(dir, name)
        if (f.isFile && (maxAgeMs <= 0 || System.currentTimeMillis() - f.lastModified() <= maxAgeMs)) {
            runCatching { f.readText() }.getOrNull()
        } else null
    }
    suspend fun writeRawText(name: String, text: String) = writeText(name, text)

    // ===== 友链补全尝试记录（拉不到 meta 的站点节流重试，避免每进页重打）=====
    private val enrichAttemptsType: Type = Types.newParameterizedType(
        Map::class.java, String::class.java, Long::class.javaObjectType
    )
    suspend fun readEnrichAttempts(): Map<String, Long>? = read("enrich_attempts.json", enrichAttemptsType)
    suspend fun writeEnrichAttempts(map: Map<String, Long>) = write("enrich_attempts.json", enrichAttemptsType, map)

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

    // ===== 聊天（消息页本地缓存：首进秒显历史，连接在后台刷新）=====
    private val publicChatType: Type = Types.newParameterizedType(List::class.java, PublicChatMessage::class.java)
    suspend fun readPublicChat(): List<PublicChatMessage>? = read("chat_public.json", publicChatType)
    suspend fun writePublicChat(items: List<PublicChatMessage>) = write("chat_public.json", publicChatType, items)

    /** key：普通用户与管理员对话为 "admin"，管理员与某用户会话为 "u{userId}" */
    private val privateChatType: Type = Types.newParameterizedType(List::class.java, PrivateChatMessage::class.java)
    suspend fun readPrivateChat(key: String): List<PrivateChatMessage>? = read("chat_private_$key.json", privateChatType)
    suspend fun writePrivateChat(key: String, items: List<PrivateChatMessage>) = write("chat_private_$key.json", privateChatType, items)

    // ===== 私信用户列表（管理员收件箱）=====
    private val chatUsersType: Type = Types.newParameterizedType(List::class.java, ChatUser::class.java)
    suspend fun readChatUsers(): List<ChatUser>? = read("chat_users.json", chatUsersType)
    suspend fun writeChatUsers(items: List<ChatUser>) = write("chat_users.json", chatUsersType, items)

    // ===== 数据管理（设置页按功能删除/查看占用）=====
    suspend fun delete(name: String): Unit = withContext(Dispatchers.IO) {
        runCatching { File(dir, name).delete() }
    }

    /** 按文件名前缀批量删除（如聊天私信 chat_private_*） */
    suspend fun deleteWhere(predicate: (String) -> Boolean): Unit = withContext(Dispatchers.IO) {
        runCatching { dir.listFiles()?.forEach { if (it.isFile && predicate(it.name)) it.delete() } }
    }

    /** 各缓存文件大小（字节），key=文件名 */
    suspend fun cacheSizes(): Map<String, Long> = withContext(Dispatchers.IO) {
        runCatching { dir.listFiles()?.filter { it.isFile }?.associate { it.name to it.length() } ?: emptyMap() }
            .getOrDefault(emptyMap())
    }

    suspend fun clearAll(): Unit = withContext(Dispatchers.IO) {
        runCatching { dir.listFiles()?.forEach { it.delete() } }
    }
}
