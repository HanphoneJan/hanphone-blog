package com.hanphone.blog

import com.hanphone.blog.util.parseApplyText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 友链申请原文解析（移植自网页端 parseApplyText）：
 * JSON / YAML·键值对 / 自由文本 + URL 兜底，字段先到先得。
 */
class ParseApplyTextTest {

    @Test
    fun jsonIsCaseInsensitiveAndIgnoresNestedValues() {
        val result = parseApplyText(
            """
            {
              "id": 123,
              "Name": "顶层小站",
              "URL": "https://top.example",
              "DESCRIPTION": "记录生活",
              "Avatar": "https://top.example/a.png",
              "nickname": null,
              "detail": { "name": "嵌套里的名字", "url": "https://nested.example" }
            }
            """.trimIndent()
        )

        assertEquals("顶层小站", result.name)
        assertEquals("https://top.example", result.url)
        assertEquals("记录生活", result.description)
        assertEquals("https://top.example/a.png", result.avatar)
        assertNull(result.linkUrl)
        assertFalse(result.isEmpty)
    }

    @Test
    fun jsonArrayUsesFirstObject() {
        val result = parseApplyText(
            """[{"name":"数组小站","link_url":"https://back.example","color":"#1890ff"}]"""
        )

        assertEquals("数组小站", result.name)
        assertEquals("https://back.example", result.linkUrl)
        assertEquals("#1890ff", result.color)
        assertNull(result.url)
    }

    @Test
    fun yamlWithChineseKeysAndQuotes() {
        val result = parseApplyText(
            """
            名称: "YAML 小站"
            链接: https://yaml.example
            回访链接: https://visit.example
            描述: '记录日常'
            头像地址: https://yaml.example/avatar.png
            """.trimIndent()
        )

        assertEquals("YAML 小站", result.name)
        assertEquals("https://yaml.example", result.url)
        assertEquals("https://visit.example", result.linkUrl)
        assertEquals("记录日常", result.description)
        assertEquals("https://yaml.example/avatar.png", result.avatar)
    }

    @Test
    fun keyValueKeepsUrlAndLinkUrlApart() {
        val result = parseApplyText(
            """
            name: 键值小站
            url: https://keys.example
            link_url: https://keys.example/visit
            rss: https://keys.example/feed.xml
            """.trimIndent()
        )

        assertEquals("键值小站", result.name)
        assertEquals("https://keys.example", result.url)
        assertEquals("https://keys.example/visit", result.linkUrl)
        assertEquals("https://keys.example/feed.xml", result.rss)
    }

    @Test
    fun chineseKeyValueText() {
        val result = parseApplyText(
            """
            你好，想和你交换友链。
            名称：云林有风
            链接：https://yunlin.example
            描述：记录生活
            站长：寒枫
            主题色：#2c7be5
            """.trimIndent()
        )

        assertEquals("云林有风", result.name)
        assertEquals("https://yunlin.example", result.url)
        assertEquals("记录生活", result.description)
        assertEquals("寒枫", result.nickname)
        assertEquals("#2c7be5", result.color)
    }

    @Test
    fun urlFallbackSkipsAvatarImages() {
        val result = parseApplyText(
            """
            我的博客：https://me.example/avatar.png
            另一个 https://me.example/blog
            """.trimIndent()
        )

        assertEquals("https://me.example/blog", result.url)
        assertNull(result.name)
        assertFalse(result.isEmpty)
    }

    @Test
    fun firstValueWins() {
        val result = parseApplyText("名称: 第一个\n名称: 第二个")

        assertEquals("第一个", result.name)
    }

    @Test
    fun blankTextIsEmpty() {
        assertTrue(parseApplyText("").isEmpty)
        assertTrue(parseApplyText("   \n\t ").isEmpty)
        assertTrue(parseApplyText("随便说点什么，没有结构化信息").isEmpty)
    }
}
