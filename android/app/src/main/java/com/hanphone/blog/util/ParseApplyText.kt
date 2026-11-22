package com.hanphone.blog.util

import com.squareup.moshi.JsonReader
import okio.Buffer

/**
 * 友链申请文本的解析结果（对应网页端 ParsedApplyText）。
 * 全部字段可空：解析不出就是 null，调用方按「非空才覆盖」合并。
 */
data class ParsedApplyText(
    val name: String? = null,
    val description: String? = null,
    val url: String? = null,
    val linkUrl: String? = null,
    val avatar: String? = null,
    val siteshot: String? = null,
    val rss: String? = null,
    val nickname: String? = null,
    val color: String? = null
) {
    /** 一个字段都没解析出来 */
    val isEmpty: Boolean
        get() = name == null && description == null && url == null && linkUrl == null &&
            avatar == null && siteshot == null && rss == null && nickname == null && color == null
}

/**
 * 解析友链申请原文。移植自网页端 `web/src/app/admin/links/utils/parseApplyText.ts`，语义保持一致：
 *
 * 1. JSON（以 `{` 或 `[` 开头；数组只取第一个对象），键名大小写不敏感、精确等于关键词；
 *    嵌套对象/数组直接忽略。JSON 命中即返回。
 * 2. YAML / 键值对（逐行 `key: value`，支持中英文冒号、去首尾引号），键名精确等于关键词。命中即返回。
 * 3. 自由文本：每行「关键词 + 冒号 + 值」，值到行尾或逗号为止。
 * 4. 自由文本后若 url 仍为空，从全文取第一个 http(s) URL（跳过已用过的与 favicon/avatar 的）。
 *
 * 每个字段「先到先得」（已填不覆盖）。纯函数，可 JVM 单测。
 */
fun parseApplyText(text: String): ParsedApplyText {
    if (text.isBlank()) return ParsedApplyText()
    val trimmed = text.trim()

    tryParseJson(trimmed)?.let { return it }
    tryParseKeyValue(trimmed)?.let { return it }

    val acc = Accumulator()
    parseFreeText(trimmed, acc)

    if (acc["url"] == null) {
        extractUrlFallback(trimmed, acc)?.let { acc.putIfAbsent(FIELD_URL, it) }
    }
    return acc.build()
}

// ---------------------------------------------------------------------------
// 字段与关键词（照抄网页端 FIELD_KEYWORDS，顺序也保持一致：先到先得的顺序依赖它）
// ---------------------------------------------------------------------------

private const val FIELD_NAME = "name"
private const val FIELD_URL = "url"
private const val FIELD_DESCRIPTION = "description"
private const val FIELD_AVATAR = "avatar"
private const val FIELD_SITESHOT = "siteshot"
private const val FIELD_RSS = "rss"
private const val FIELD_NICKNAME = "nickname"
private const val FIELD_COLOR = "color"
private const val FIELD_LINK_URL = "link_url"

private val FIELD_KEYWORDS: List<Pair<String, List<String>>> = listOf(
    FIELD_NAME to listOf("名称", "站点名", "标题", "网站名", "站点", "名字", "name", "title", "sitename", "blogname"),
    FIELD_URL to listOf("链接", "网址", "地址", "网站", "url", "site", "link", "href", "homepage"),
    FIELD_DESCRIPTION to listOf("描述", "简介", "说明", "介绍", "签名", "descr", "description", "desc", "bio", "motto"),
    FIELD_AVATAR to listOf("头像", "图标", "logo", "头像地址", "图标地址", "avatar", "icon", "favicon"),
    FIELD_SITESHOT to listOf("截图", "预览", "预览图", "站点截图", "网站截图", "封面图", "siteshot", "screenshot", "cover"),
    FIELD_RSS to listOf("rss", "订阅", "feed", "atom", "xml"),
    FIELD_NICKNAME to listOf("昵称", "站长", "作者", "名字", "网名", "nickname", "author", "blogger"),
    FIELD_COLOR to listOf("颜色", "主题色", "装饰色", "配色", "color", "theme", "accent"),
    FIELD_LINK_URL to listOf("回访链接", "回访地址", "回访网址", "回访", "backlink", "link_url")
)

/** 独立 URL（与网页端一致的字符集：逗号、引号、尖括号、空白都截断） */
private val URL_REGEX = Regex("""https?://[^\s"'<>\n,，]+""", RegexOption.IGNORE_CASE)

/** 行首关键词 + 冒号 + 值（到行尾或逗号止） */
private fun freeTextRegex(keywords: List<String>): Regex {
    val pattern = keywords.joinToString("|") { Regex.escape(it) }
    return Regex(
        """(?:^|[\n\r])\s*(?:$pattern)\s*[:：]\s*["']?([^"\n\r,，]+?)["']?\s*(?:$|[\n\r])""",
        setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)
    )
}

/** 解析过程的累加器：字段「先到先得」 */
private class Accumulator {
    private val values = LinkedHashMap<String, String>()

    operator fun get(field: String): String? = values[field]

    fun putIfAbsent(field: String, rawValue: String) {
        val value = rawValue.trim()
        if (value.isEmpty()) return
        if (!values.containsKey(field)) values[field] = value
    }

    fun isEmpty(): Boolean = values.isEmpty()

    fun build(): ParsedApplyText = ParsedApplyText(
        name = values[FIELD_NAME],
        description = values[FIELD_DESCRIPTION],
        url = values[FIELD_URL],
        linkUrl = values[FIELD_LINK_URL],
        avatar = values[FIELD_AVATAR],
        siteshot = values[FIELD_SITESHOT],
        rss = values[FIELD_RSS],
        nickname = values[FIELD_NICKNAME],
        color = values[FIELD_COLOR]
    )
}

// ---------------------------------------------------------------------------
// 1. JSON
// ---------------------------------------------------------------------------

/**
 * 手工读取顶层对象（不用 org.json：JVM 单测里它是 stub，会 `not mocked`）。
 * 只关心顶层键值；嵌套对象/数组用 skipValue 忽略。
 */
private fun tryParseJson(text: String): ParsedApplyText? {
    if (!text.startsWith("{") && !text.startsWith("[")) return null

    val fields = LinkedHashMap<String, String>() // 原始键 → 值（保持出现顺序）
    try {
        JsonReader.of(Buffer().writeUtf8(text)).use { reader ->
            when (reader.peek()) {
                JsonReader.Token.BEGIN_OBJECT -> Unit
                JsonReader.Token.BEGIN_ARRAY -> {
                    reader.beginArray()
                    // 网页端只取数组第一个元素；不是对象就当解析失败，不再往后找
                    if (!reader.hasNext() || reader.peek() != JsonReader.Token.BEGIN_OBJECT) return null
                }
                else -> return null
            }

            reader.beginObject()
            while (reader.hasNext()) {
                val key = reader.nextName()
                when (reader.peek()) {
                    JsonReader.Token.BEGIN_OBJECT,
                    JsonReader.Token.BEGIN_ARRAY -> reader.skipValue()

                    JsonReader.Token.NULL -> reader.skipValue()

                    JsonReader.Token.STRING -> fields[key] = reader.nextString()

                    // 数字按原文转字符串（nextString 对 NUMBER 返回字面量）
                    JsonReader.Token.NUMBER -> fields[key] = reader.nextString()

                    JsonReader.Token.BOOLEAN -> fields[key] = reader.nextBoolean().toString()

                    else -> reader.skipValue()
                }
            }
            // 数组分支：读完第一个对象就够，剩下内容不再关心
            reader.endObject()
        }
    } catch (e: Exception) {
        // 非法 JSON 交给下一层格式尝试（网页端 JSON.parse 失败同样返回 null）
        return null
    }

    if (fields.isEmpty()) return null

    val acc = Accumulator()
    for ((field, keywords) in FIELD_KEYWORDS) {
        for (keyword in keywords) {
            val matchedKey = fields.keys.firstOrNull { it.equals(keyword, ignoreCase = true) }
                ?: continue
            val value = fields[matchedKey].orEmpty()
            if (value.isBlank()) continue
            acc.putIfAbsent(field, value)
            break
        }
    }
    return if (acc.isEmpty()) null else acc.build()
}

// ---------------------------------------------------------------------------
// 2. YAML / 键值对
// ---------------------------------------------------------------------------

private val YAML_LINE_REGEX = Regex("""^\s*([^:：]+?)\s*[:：]\s*(.+?)\s*$""")

private fun stripQuotes(value: String): String {
    var v = value
    if (v.isNotEmpty() && (v.first() == '"' || v.first() == '\'')) v = v.substring(1)
    if (v.isNotEmpty() && (v.last() == '"' || v.last() == '\'')) v = v.dropLast(1)
    return v
}

private fun tryParseKeyValue(text: String): ParsedApplyText? {
    val acc = Accumulator()

    for (line in text.split('\n')) {
        val match = YAML_LINE_REGEX.find(line) ?: continue
        val key = match.groupValues[1].trim().lowercase()
        val value = stripQuotes(match.groupValues[2].trim())
        if (value.isEmpty()) continue

        for ((field, keywords) in FIELD_KEYWORDS) {
            if (keywords.none { it.lowercase() == key }) continue

            if (field == FIELD_URL) {
                // 回访类地址不能占掉自己的站点链接
                if (key.contains("回访") || key == "link_url" || key == "backlink") {
                    acc.putIfAbsent(FIELD_LINK_URL, value)
                } else {
                    acc.putIfAbsent(FIELD_URL, value)
                }
            } else if (field == FIELD_LINK_URL) {
                // 关键词表里 url 的写法也可能落到这里，要求确实是回访
                if (key.contains("回访") || key == "link_url" || key == "backlink") {
                    acc.putIfAbsent(FIELD_LINK_URL, value)
                }
            } else {
                acc.putIfAbsent(field, value)
            }
            break
        }
    }

    return if (acc.isEmpty()) null else acc.build()
}

// ---------------------------------------------------------------------------
// 3. 自由文本
// ---------------------------------------------------------------------------

/** 匹配顺序按字段顺序，字段内取第一处命中；同字段先到先得 */
private fun parseFreeText(text: String, acc: Accumulator) {
    for ((field, keywords) in FIELD_KEYWORDS) {
        val match = freeTextRegex(keywords).find(text) ?: continue
        val raw = match.groupValues[1]
            .replace(Regex("""[,，;；\s]+$"""), "")
            .trim()
        if (raw.isEmpty()) continue

        if (field == FIELD_URL) {
            // 匹配位置前约 20 字若是「回访」/backlink，则这是回访地址
            val before = text.substring(maxOf(0, match.range.first - 20), match.range.first).lowercase()
            if (before.contains("回访") || before.contains("backlink")) {
                acc.putIfAbsent(FIELD_LINK_URL, raw)
                continue
            }
        }
        acc.putIfAbsent(field, raw)
    }
}

// ---------------------------------------------------------------------------
// 4. URL 兜底
// ---------------------------------------------------------------------------

/** 全文第一个独立 URL；跳过已解析用掉的、以及 favicon/avatar 这类图片地址 */
private fun extractUrlFallback(text: String, acc: Accumulator): String? {
    val used = listOfNotNull(
        acc[FIELD_URL], acc[FIELD_LINK_URL], acc[FIELD_AVATAR],
        acc[FIELD_SITESHOT], acc[FIELD_RSS]
    ).toSet()
    return URL_REGEX.findAll(text)
        .map { it.value.trim() }
        .firstOrNull { it.isNotEmpty() && it !in used && !it.contains("favicon") && !it.contains("avatar") }
}
