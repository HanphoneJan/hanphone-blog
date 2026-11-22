package com.hanphone.blog

import com.hanphone.blog.data.api.ApiClient
import com.hanphone.blog.data.api.FileEntry
import com.hanphone.blog.data.api.FilesResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * admin-file `GET /files` 的 JSON 契约回归。
 *
 * 关键点：`mtime/birthtime` 是服务端 `JSON.stringify(Date)` 出来的 ISO 字符串（带毫秒 + Z），
 * 必须被全局 Date 适配器解析成功；字段缺失时走 Kotlin 默认值而不是抛 JsonDataException。
 */
class AdminFilesJsonTest {

    private val adapter = ApiClient.moshi.adapter(FilesResult::class.java)

    @Test
    fun parsesRootNamespaceListing() {
        val json = """
            {"code":200,"message":"获取根目录内容成功","items":[
              {"name":"blog","isDirectory":true,"type":"namespace","size":4096,
               "mtime":"2026-11-22T10:00:00.000Z","birthtime":"2026-01-01T00:00:00.000Z"}
            ]}
        """.trimIndent()

        val res = adapter.fromJson(json)!!
        assertEquals(200, res.code)
        assertEquals(1, res.items.size)
        assertNull(res.error)
        val entry: FileEntry = res.items.first()
        assertEquals("blog", entry.name)
        assertTrue(entry.isDirectory)
        assertEquals("namespace", entry.type)
        assertEquals(4096L, entry.size)
        assertNotNull(entry.mtime)
        assertNotNull(entry.birthtime)
    }

    @Test
    fun parsesDirectoryItemsWithMissingOptionalFields() {
        val json = """
            {"code":200,"message":"获取文件列表成功","items":[
              {"name":"a.jpg","isDirectory":false,"size":1024,"mtime":"2026-11-22T10:00:00.000Z",
               "birthtime":"2026-11-22T10:00:00.000Z","category":null,"namespace":"blog/docs"}
            ],"namespace":"blog/docs"}
        """.trimIndent()

        val res = adapter.fromJson(json)!!
        val entry = res.items.first()
        assertFalse(entry.isDirectory)
        assertNull(entry.category)
        assertEquals("blog/docs", entry.namespace)
        // 根目录条目没有 type 字段 → 默认空串，不是解析失败
        assertTrue(res.items.none { it.type != null })
    }

    @Test
    fun parsesErrorBody() {
        val res = adapter.fromJson("""{"error":"目录不存在","namespace":"blog/gone"}""")!!
        assertEquals(0, res.code)
        assertEquals("目录不存在", res.error)
        assertTrue(res.items.isEmpty())
    }
}
