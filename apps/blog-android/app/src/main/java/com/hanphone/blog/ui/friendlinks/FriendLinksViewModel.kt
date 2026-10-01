package com.hanphone.blog.ui.friendlinks

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/** 网页端 `next-api/metadata` 返回的补全信息 */
private data class MetaResult(val title: String, val description: String, val avatar: String)

/** 博客站域名（默认头像/相对路径都挂在博客站，而非文件服务） */
private const val BLOG_SITE = "https://hanphone.cn"

/** 解码 HTML 实体（对齐 web 的 decodeHtmlEntities；q1.qlogo.cn 等头像 URL 常含 &amp;） */
private fun decodeEntities(s: String): String =
    s.replace("&amp;", "&")
        .replace("&#39;", "'")
        .replace("&quot;", "\"")
        .replace("&lt;", "<")
        .replace("&gt;", ">")

/** 头像归一化：解码实体 + 相对路径挂到博客站域名；默认头像视为缺失，交给首字占位符兜底 */
private fun normalizeAvatar(av: String?): String? {
    if (av.isNullOrBlank()) return av
    val d = decodeEntities(av)
    val abs = if (d.startsWith("http://") || d.startsWith("https://")) d else BLOG_SITE + d
    return if (abs == "$BLOG_SITE/default-avatar.png") null else abs
}

/** 归一化友链（解码 avatar/url/name/description 实体，头像转绝对地址） */
private fun normalizeLinks(links: List<FriendLink>): List<FriendLink> = links.map {
    it.copy(
        avatar = normalizeAvatar(it.avatar),
        url = decodeEntities(it.url),
        name = decodeEntities(it.name),
        description = decodeEntities(it.description)
    )
}

/**
 * 友链列表：三层缓存（MemoryCache → ContentStore → 网络静默刷新）。
 * 参考网页端（web LinkClient）：推荐在前 + 按类型筛选；对缺失描述/头像/域名的链接，
 * 拉取站点元数据（`https://hanphone.cn/next-api/metadata`）补齐信息。
 */
@HiltViewModel
class FriendLinksViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel() {

    var links by mutableStateOf(normalizeLinks(MemoryCache.friendLinks ?: emptyList()))
        private set
    var loading by mutableStateOf(MemoryCache.friendLinks == null)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    /** 当前筛选类型：null = 全部（对应 web 的「全部」筛选） */
    var activeType by mutableStateOf<String?>(null)
        private set

    /** 推荐在前，再按类型筛选（与 web 友链页一致） */
    val filtered: List<FriendLink>
        get() {
            val sorted = links.sortedWith(compareByDescending { it.recommend })
            return if (activeType == null) sorted else sorted.filter { it.type == activeType }
        }

    init {
        viewModelScope.launch {
            val cached = ContentStore.readFriendLinks()
            if (cached != null && links.isEmpty()) {
                links = normalizeLinks(cached)
                loading = false
            }
        }
        // 首次加载友链列表
        refresh()
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            try {
                // 冷启动/首载：内存还没装填时，先读磁盘缓存作为「已知补全数据」，
                // 避免接下来用网络原始数据覆盖掉已补全(head next-api)的头像/描述。
                val known = if (links.isNotEmpty()) links
                else runCatching { ContentStore.readFriendLinks() }.getOrNull()
                    ?.let { normalizeLinks(it) } ?: emptyList()

                val res = repo.friendLinks()
                if (res.flag) {
                    // 合并：先用网络原始数据，但保留已知补全项（头像/描述/名称），
                    // 这样已补全结果会被缓存复用，而不是每次刷新清空重来。
                    val merged = mergeEnriched(known, normalizeLinks(res.data ?: emptyList()))
                    links = merged
                    MemoryCache.friendLinks = merged
                    ContentStore.writeFriendLinks(merged)
                    error = null
                    // 只对仍缺失的进行补全（静默，失败不影响列表）
                    enrichMissing(merged)
                } else error = res.message.ifBlank { "加载失败" }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
            refreshing = false
        }
    }

    /**
     * 合并网络返回与已知（已补全）数据：网络值优先，但网络空缺/带默认头像/「暂无描述」时
     * 复用已知补全值，确保 next-api 补全结果不因刷新丢失，真正吃到缓存。
     */
    private fun mergeEnriched(known: List<FriendLink>, fresh: List<FriendLink>): List<FriendLink> {
        if (known.isEmpty()) return fresh
        val knownMap = known.associateBy { it.id }
        return fresh.map { f ->
            val k = knownMap[f.id] ?: return@map f
            val fAvatarBlank = f.avatar.isNullOrBlank() || f.avatar.endsWith("/default-avatar.png")
            val fDescBlank = f.description.isBlank() || f.description == "暂无描述"
            f.copy(
                avatar = if (fAvatarBlank) k.avatar else f.avatar,
                description = if (fDescBlank) k.description else f.description,
                name = if (f.name.isBlank()) k.name else f.name
            )
        }
    }

    fun setType(type: String?) {
        activeType = type
    }

    /** 哪些友链需要从网页补全信息（对齐 web LinkClient 的判定） */
    private fun needsEnrich(link: FriendLink): Boolean {
        val hasGenericDesc = link.description.isBlank() || link.description == "暂无描述"
        val hasNoAvatar = link.avatar.isNullOrBlank()
        val nameMismatch = runCatching {
            val raw = if (link.url.startsWith("http")) link.url else "https://${link.url}"
            val host = URL(raw).host.removePrefix("www.")
            !link.name.lowercase().contains(host.lowercase())
        }.getOrDefault(true)
        return hasGenericDesc || hasNoAvatar || nameMismatch
    }

    /** 拉取站点元数据（对齐 web `next-api/metadata` 返回结构；用 OkHttp 自动跟随重定向） */
    private val metaClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    private suspend fun fetchMeta(link: FriendLink): MetaResult? = withContext(Dispatchers.IO) {
        try {
            val rawUrl = if (link.url.startsWith("http")) link.url else "https://${link.url}"
            val urlObj = URL(rawUrl)
            val domain = urlObj.host.removePrefix("www.").lowercase()
            val api = "https://hanphone.cn/next-api/metadata?url=${
                URLEncoder.encode(rawUrl, "UTF-8")
            }&validDomain=${URLEncoder.encode(domain, "UTF-8")}"
            val req = Request.Builder().url(api).header(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            ).build()
            metaClient.newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    val body = resp.body?.string() ?: return@use null
                    val json = JSONObject(body)
                    MetaResult(
                        title = json.optString("title").ifBlank { urlObj.host },
                        description = json.optString("description"),
                        avatar = json.optString("avatar")
                    )
                } else null
            }
        } catch (e: Exception) {
            null
        }
    }

    /** 批量补齐缺失信息（分组 5 个，对齐 web 的批量拉取；仅填空、不覆盖已有内容） */
    private fun enrichMissing(initial: List<FriendLink>) {
        viewModelScope.launch {
            val toEnrich = initial.filter { needsEnrich(it) }
            if (toEnrich.isEmpty()) return@launch
            val updated = initial.toMutableList()
            toEnrich.chunked(5).forEach { batch ->
                batch.forEach { link ->
                    val idx = updated.indexOfFirst { it.id == link.id }
                    if (idx == -1) return@forEach
                    val meta = fetchMeta(link) ?: return@forEach
                    val orig = updated[idx]
                    updated[idx] = orig.copy(
                        description = if (orig.description.isBlank() || orig.description == "暂无描述") meta.description else orig.description,
                        avatar = if (orig.avatar.isNullOrBlank() && meta.avatar.isNotBlank()) meta.avatar else orig.avatar,
                        name = if (orig.name.isBlank()) meta.title else orig.name
                    )
                }
            }
            links = updated
            MemoryCache.friendLinks = updated
            ContentStore.writeFriendLinks(updated)
        }
    }
}