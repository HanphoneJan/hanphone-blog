package com.hanphone.blog.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hanphone.blog.util.resolveImageUrl
import com.mikepenz.markdown.coil2.Coil2ImageTransformerImpl
import com.mikepenz.markdown.compose.elements.MarkdownHighlightedCodeBlock
import com.mikepenz.markdown.compose.elements.MarkdownHighlightedCodeFence
import com.mikepenz.markdown.compose.components.markdownComponents
import com.mikepenz.markdown.model.markdownDimens
import com.mikepenz.markdown.m3.Markdown
import com.mikepenz.markdown.m3.markdownTypography
import dev.snipme.highlights.Highlights
import dev.snipme.highlights.model.SyntaxThemes

/**
 * Markdown 渲染：基于成熟库 mikepenz/multiplatform-markdown-renderer（M3 + Coil2 + 代码高亮）。
 *
 * 对齐网页版的定制：
 * - typography 按 web 的 blog.css（h1 26sp 加粗、h2 22sp、正文 16sp/行高 27），替换库默认的 display 尺寸；
 * - 代码围栏/代码块走 Highlights 高亮（Atom 主题，深浅色跟随当前主题）；
 * - 表格列宽 220dp，宽表自动进入横向滚动；
 * - HTML 实体解码（`&amp;quot;` 双重转义）+ 相对 URL 绝对化。
 */

/** 目录项：level = 标题级别（1-3），blockIndex = 块序号（用于滚动定位） */
data class TocHeading(val level: Int, val text: String, val blockIndex: Int)

/**
 * 按块级切分 markdown（标题/代码围栏/表格/引用/段落各自成块），
 * 供详情页逐块渲染 + 标题锚点跳转。
 */
fun splitMarkdownBlocks(markdown: String): List<String> {
    val lines = markdown.replace("\r\n", "\n").split("\n")
    val blocks = mutableListOf<String>()
    var i = 0
    while (i < lines.size) {
        val trimmed = lines[i].trim()
        when {
            trimmed.isEmpty() -> i++

            trimmed.startsWith("```") -> { // 代码围栏
                val sb = StringBuilder(lines[i]).append('\n'); i++
                while (i < lines.size && !lines[i].trim().startsWith("```")) {
                    sb.append(lines[i]).append('\n'); i++
                }
                if (i < lines.size) { sb.append(lines[i]).append('\n'); i++ }
                blocks.add(sb.toString())
            }

            trimmed.startsWith("#") -> { // 标题
                blocks.add(trimmed); i++
            }

            trimmed.startsWith(">") -> { // 引用（连续行）
                val sb = StringBuilder()
                while (i < lines.size && lines[i].trim().startsWith(">")) {
                    sb.append(lines[i]).append('\n'); i++
                }
                blocks.add(sb.toString())
            }

            trimmed.contains('|') && i + 1 < lines.size &&
                lines[i + 1].trim().matches(Regex("""^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$""")) -> { // 表格
                val sb = StringBuilder(lines[i]).append('\n'); i++
                while (i < lines.size && lines[i].trim().contains('|') && lines[i].trim().isNotEmpty()) {
                    sb.append(lines[i]).append('\n'); i++
                }
                blocks.add(sb.toString())
            }

            else -> { // 段落/列表：连续非空行聚合
                val sb = StringBuilder()
                while (i < lines.size && lines[i].trim().isNotEmpty() &&
                    !lines[i].trim().startsWith("```") &&
                    !lines[i].trim().startsWith("#")
                ) {
                    sb.append(lines[i]).append('\n'); i++
                }
                if (sb.isNotBlank()) blocks.add(sb.toString())
            }
        }
    }
    return blocks
}

/** 提取 1-3 级标题作为目录项 */
fun extractTocHeadings(blocks: List<String>): List<TocHeading> {
    val result = mutableListOf<TocHeading>()
    blocks.forEachIndexed { index, block ->
        val t = block.trim()
        val hashes = t.takeWhile { it == '#' }
        if (hashes.length in 1..3 && t.length > hashes.length && t[hashes.length] == ' ') {
            val text = t.drop(hashes.length).trim()
                .replace(Regex("\\*\\*|~~|`"), "")
                .replace(Regex("\\[([^\\]]*)]\\([^)]*\\)"), "$1")
            if (text.isNotBlank()) result.add(TocHeading(hashes.length, text, index))
        }
    }
    return result
}

/** 整篇渲染（随笔等短内容） */
@Composable
fun MarkdownContent(markdown: String, modifier: Modifier = Modifier) {
    val content = remember(markdown) { preprocessMarkdown(markdown) }
    MarkdownCore(content, modifier)
}

/** 单块渲染（文章详情逐块渲染，支持标题跳转） */
@Composable
fun MarkdownBlockContent(block: String, modifier: Modifier = Modifier) {
    val content = remember(block) { preprocessMarkdown(block) }
    MarkdownCore(content, modifier)
}

@Composable
private fun MarkdownCore(content: String, modifier: Modifier) {
    // 高亮主题跟随当前深浅色（surface 亮度判断，兼容手动主题切换）
    val darkTheme = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val highlightsBuilder = remember(darkTheme) {
        Highlights.Builder().theme(SyntaxThemes.atom(darkMode = darkTheme))
    }

    Markdown(
        content,
        imageTransformer = Coil2ImageTransformerImpl,
        components = markdownComponents(
            codeFence = {
                MarkdownHighlightedCodeFence(
                    content = it.content,
                    node = it.node,
                    highlights = highlightsBuilder,
                )
            },
            codeBlock = {
                MarkdownHighlightedCodeBlock(
                    content = it.content,
                    node = it.node,
                    highlights = highlightsBuilder,
                )
            },
        ),
        dimens = markdownDimens(tableCellWidth = 220.dp),
        typography = markdownTypography(
            h1 = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.Bold, lineHeight = 36.sp),
            h2 = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 31.sp),
            h3 = TextStyle(fontSize = 19.sp, fontWeight = FontWeight.SemiBold, lineHeight = 27.sp),
            h4 = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold, lineHeight = 24.sp),
            h5 = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold, lineHeight = 23.sp),
            h6 = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.SemiBold, lineHeight = 22.sp),
            text = MaterialTheme.typography.bodyLarge.copy(lineHeight = 27.sp),
            paragraph = MaterialTheme.typography.bodyLarge.copy(lineHeight = 27.sp),
            code = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
        ),
        modifier = modifier
    )
}

/** 匹配 [文本](url) / ![描述](url) 的链接目标部分 */
private val markdownLinkRegex = Regex("""(!?\[[^\]]*\]\()([^)\s]+)(\))""")

private fun preprocessMarkdown(raw: String): String {
    val decoded = decodeHtmlEntities(raw)
    return markdownLinkRegex.replace(decoded) { match ->
        val (prefix, url, suffix) = match.destructured
        val absolute = if (url.startsWith("http://") || url.startsWith("https://")) {
            url
        } else {
            resolveImageUrl(url) ?: url
        }
        "$prefix$absolute$suffix"
    }
}

private fun decodeHtmlEntities(raw: String): String {
    var s = raw
    repeat(3) {
        val decoded = s
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&#x27;", "'")
            .replace("&nbsp;", "\u00A0")
            .replace("&amp;", "&")
        if (decoded == s) return decoded
        s = decoded
    }
    return s
}
