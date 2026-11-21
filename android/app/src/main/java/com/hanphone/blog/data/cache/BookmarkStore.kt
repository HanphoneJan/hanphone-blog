package com.hanphone.blog.data.cache

import com.hanphone.blog.data.repo.BookmarkRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 收藏状态（进程级单例）：只保存 `TYPE:key` 集合，供各页图标秒显/切换。
 *
 * - 登录后由 `BlogAppRoot` 调 [refresh] 拉一次 `/bookmarks`（全部类型）；
 * - 退出登录 [clear]；
 * - [toggle] 乐观更新，请求失败回滚并返回 null（调用方负责提示）。
 *
 * 收藏列表页的完整条目（标题/副标题）仍走 Repository，不经这里。
 */
object BookmarkStore {

    const val BLOG = "BLOG"
    const val ESSAY = "ESSAY"
    const val DOC = "DOC"

    private val repo = BookmarkRepository()

    private val _keys = MutableStateFlow<Set<String>>(emptySet())

    /** 形如 "BLOG:12" / "DOC:some-doc-id" */
    val keys: StateFlow<Set<String>> = _keys.asStateFlow()

    /** 统一的 key 拼接（UI 判断收藏态、列表过滤都用它，别各写一份） */
    fun id(type: String, key: Any): String = "${type.uppercase()}:$key"

    fun isBookmarked(type: String, key: Any): Boolean = id(type, key) in _keys.value

    /** 登录后拉全部收藏；失败保持原值（不影响页面） */
    suspend fun refresh() {
        runCatching { repo.list() }.onSuccess { res ->
            if (res.flag) {
                _keys.value = (res.data ?: emptyList())
                    .map { id(it.type, it.key) }
                    .toSet()
            }
        }
    }

    /**
     * 切换收藏（乐观更新）。返回新状态；失败已回滚并返回 null。
     * 网络异常同样收敛成 null，不向 UI 抛。
     */
    suspend fun toggle(type: String, key: Any): Boolean? {
        val t = type.uppercase()
        val k = key.toString()
        val id = id(t, k)
        val wasBookmarked = id in _keys.value

        _keys.value = if (wasBookmarked) _keys.value - id else _keys.value + id

        val res = runCatching {
            if (wasBookmarked) repo.remove(t, k) else repo.add(t, k)
        }.getOrNull()

        if (res == null || !res.flag) {
            // 回滚
            _keys.value = if (wasBookmarked) _keys.value + id else _keys.value - id
            return null
        }
        return !wasBookmarked
    }

    fun clear() {
        _keys.value = emptySet()
    }
}
