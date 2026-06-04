package com.example.blog.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

/**
 * MarkdownUtils 工具类单元测试
 */
class MarkdownUtilsTest {

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - 标题")
    void markdownToHtml_HeadingShouldRenderCorrectly() {
        String markdown = "# 一级标题\n## 二级标题";
        
        String html = MarkdownUtils.markdownToHtml(markdown);
        
        assertTrue(html.contains("<h1>"));
        assertTrue(html.contains("</h1>"));
        assertTrue(html.contains("一级标题"));
        assertTrue(html.contains("<h2>"));
    }

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - 段落")
    void markdownToHtml_ParagraphShouldRenderCorrectly() {
        String markdown = "这是一段普通文本。";
        
        String html = MarkdownUtils.markdownToHtml(markdown);
        
        assertTrue(html.contains("<p>"));
        assertTrue(html.contains("这是一段普通文本。"));
    }

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - 加粗")
    void markdownToHtml_BoldTextShouldRenderCorrectly() {
        String markdown = "这是**加粗**文本。";
        
        String html = MarkdownUtils.markdownToHtml(markdown);
        
        assertTrue(html.contains("<strong>"));
        assertTrue(html.contains("加粗"));
    }

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - 列表")
    void markdownToHtml_ListShouldRenderCorrectly() {
        String markdown = "- 项目1\n- 项目2\n- 项目3";
        
        String html = MarkdownUtils.markdownToHtml(markdown);
        
        assertTrue(html.contains("<ul>"));
        assertTrue(html.contains("<li>"));
        assertTrue(html.contains("项目1"));
    }

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - 链接")
    void markdownToHtml_LinkShouldRenderCorrectly() {
        String markdown = "[百度](https://www.baidu.com)";
        
        String html = MarkdownUtils.markdownToHtml(markdown);
        
        assertTrue(html.contains("<a "));
        assertTrue(html.contains("href="));
        assertTrue(html.contains("https://www.baidu.com"));
    }

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - 空字符串")
    void markdownToHtml_EmptyStringShouldReturnEmpty() {
        String html = MarkdownUtils.markdownToHtml("");
        
        assertNotNull(html);
        assertEquals("", html);
    }

    @Test
    @DisplayName("测试基础 Markdown 转 HTML - null 输入")
    void markdownToHtml_NullShouldReturnEmpty() {
        String html = MarkdownUtils.markdownToHtml(null);
        
        assertNotNull(html);
        assertEquals("", html);
    }

    @Test
    @DisplayName("测试增强版 Markdown 转 HTML - 表格")
    void markdownToHtmlExtensions_TableShouldRenderCorrectly() {
        String markdown = "| 列1 | 列2 |\n|-----|-----|\n| A   | B   |";
        
        String html = MarkdownUtils.markdownToHtmlExtensions(markdown);
        
        assertTrue(html.contains("<table"));
        assertTrue(html.contains("<tr>"));
    }

    @Test
    @DisplayName("测试增强版 Markdown 转 HTML - 空字符串")
    void markdownToHtmlExtensions_EmptyStringShouldReturnEmpty() {
        String html = MarkdownUtils.markdownToHtmlExtensions("");
        
        assertNotNull(html);
        assertEquals("", html);
    }

    @Test
    @DisplayName("测试去除 Markdown 标签")
    void removeMarkdownTags_ShouldReturnPlainText() {
        String markdown = "# 标题\n\n这是一段**加粗**的文本。";
        
        String text = MarkdownUtils.removeMarkdownTags(markdown);
        
        assertNotNull(text);
        assertFalse(text.contains("#"));
        assertFalse(text.contains("**"));
        assertTrue(text.contains("标题"));
        assertTrue(text.contains("加粗"));
    }

    @Test
    @DisplayName("测试去除 Markdown 标签 - 空字符串")
    void removeMarkdownTags_EmptyStringShouldReturnEmpty() {
        String text = MarkdownUtils.removeMarkdownTags("");
        
        assertNotNull(text);
    }
}
