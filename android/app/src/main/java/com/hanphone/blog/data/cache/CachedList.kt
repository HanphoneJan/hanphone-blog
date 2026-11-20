package com.hanphone.blog.data.cache

/**
 * 列表型数据的三层缓存助手：Memory（同步秒显）→ Disk（冷启动）→ 网络（由调用方负责）。
 *
 * 只收口「冷启动读盘回填内存」与「拿到网络结果后回写内存 + 落盘」这两段样板；
 * 请求本身仍由各 VM 发起（数据源与筛选条件不同，强行统一会藏掉细节）。
 */
class CachedList<T>(
    private val memory: () -> List<T>?,
    private val writeMemory: (List<T>) -> Unit,
    private val readDisk: suspend () -> List<T>?,
    private val writeDisk: suspend (List<T>) -> Unit
) {
    /** 冷启动：内存已有就返回，否则读盘并回填内存 */
    suspend fun seed(): List<T>? = memory() ?: readDisk()?.also(writeMemory)

    /** 网络结果回写：内存 + 磁盘 */
    suspend fun store(list: List<T>) {
        writeMemory(list)
        writeDisk(list)
    }
}
