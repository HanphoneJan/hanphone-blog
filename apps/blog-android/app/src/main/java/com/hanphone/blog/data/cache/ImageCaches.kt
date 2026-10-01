package com.hanphone.blog.data.cache

import android.content.Context
import coil.ImageLoader
import coil.disk.DiskCache
import coil.memory.MemoryCache

/**
 * 按功能/页面分区的图片磁盘缓存。
 *
 * Coil 默认的磁盘缓存是**单一目录、不可按业务分区**，无法在「数据管理」里单独清除某个页面的图片。
 * 这里为每个功能维护独立的 Coil ImageLoader，各自拥有独立的磁盘缓存目录
 * （`filesDir/image_cache/<功能键>`，持久化到私有存储），从而支持按功能/页面展示占用并独立清除。
 * 内存缓存共享一份（内存在进程级即可，无需分区）。
 */
object ImageCaches {

    enum class Feature(val key: String, val label: String) {
        BLOG("blog", "首页文章"),
        ESSAY("essay", "随笔"),
        PROJECT("project", "项目"),
        FRIEND("friend", "友链"),
        MESSAGE("message", "留言板"),
        CHAT("chat", "消息/聊天"),
        PROFILE("profile", "我的")
    }

    private lateinit var app: Context
    private val loaders = mutableMapOf<Feature, ImageLoader>()
    private var memo: MemoryCache? = null

    /** 在 Application.onCreate 中调用 */
    fun init(context: Context) {
        app = context.applicationContext
    }

    private fun memory(): MemoryCache =
        memo ?: MemoryCache.Builder(app).maxSizePercent(0.2).build().also { memo = it }

    /** 取某功能对应的 ImageLoader（无则惰性创建，独立磁盘缓存目录） */
    fun loader(f: Feature): ImageLoader = loaders.getOrPut(f) {
        ImageLoader.Builder(app)
            .memoryCache(memory())
            .diskCache(
                DiskCache.Builder()
                    .directory(app.filesDir.resolve("image_cache/${f.key}"))
                    .maxSizeBytes(64L * 1024 * 1024)
                    .build()
            )
            .build()
    }

    /** 某功能的磁盘图片缓存占用（该功能从未加载图片则为 0） */
    fun diskSize(f: Feature): Long = loaders[f]?.diskCache?.size?.toLong() ?: 0L

    /** 全部分区的磁盘占用（key=功能） */
    fun diskSizes(): Map<Feature, Long> = Feature.entries.associateWith { diskSize(it) }

    /** 共享内存缓存占用 */
    fun memorySize(): Long = memo?.size?.toLong() ?: 0L

    /** 清除某功能的磁盘图片缓存 */
    fun clear(f: Feature) {
        loaders[f]?.diskCache?.clear()
    }

    /** 清除全部功能的磁盘图片缓存 */
    fun clearAll() {
        Feature.entries.forEach { clear(it) }
    }

    /** 清除内存图片缓存 */
    fun clearMemory() {
        memo?.clear()
    }
}