package com.example.blog.util;

import org.commonmark.Extension;
import org.commonmark.ext.gfm.tables.TableBlock;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.ext.heading.anchor.HeadingAnchorExtension;
import org.commonmark.node.Link;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.AttributeProvider;
import org.commonmark.renderer.html.AttributeProviderContext;
import org.commonmark.renderer.html.AttributeProviderFactory;
import org.commonmark.renderer.html.HtmlRenderer;
import org.commonmark.renderer.text.TextContentRenderer;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Markdown 工具类 - 提供 Markdown 到 HTML 的转换功能
 */
public class MarkdownUtils {

    // 支持的扩展列表
    private static final List<Extension> EXTENSIONS = Arrays.asList(
            TablesExtension.create(),
            HeadingAnchorExtension.create()
    );

    // 单例解析器和渲染器，避免重复创建
    private static final Parser PARSER = Parser.builder()
            .extensions(EXTENSIONS)
            .build();

    private static final HtmlRenderer RENDERER = HtmlRenderer.builder()
            .extensions(EXTENSIONS)
            .attributeProviderFactory(new CustomAttributeProviderFactory())
            .build();

    private static final TextContentRenderer TEXT_RENDER = TextContentRenderer.builder().build();
    /**
     * 基础 Markdown 转 HTML（无扩展）
     * @param markdown Markdown 文本
     * @return HTML 字符串
     */
    public static String markdownToHtml(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "";
        }

        Parser basicParser = Parser.builder().build();
        Node document = basicParser.parse(markdown);
        HtmlRenderer basicRenderer = HtmlRenderer.builder().build();

        return basicRenderer.render(document);
    }

    /**
     * 增强版 Markdown 转 HTML（包含表格、标题锚点等扩展）
     * @param markdown Markdown 文本
     * @return HTML 字符串
     */
    public static String markdownToHtmlExtensions(String markdown) {
        if (markdown == null || markdown.trim().isEmpty()) {
            return "";
        }

        Node document = PARSER.parse(markdown);
        return RENDERER.render(document);
    }

    /**
     * @author hzz
     去除markdown格式，将markdown转成纯文本
     */
    public static String removeMarkdownTags(String markdownText) {
        Node document = PARSER.parse(markdownText);
        return TEXT_RENDER.render(document);
    }

    /**
     * 自定义属性提供工厂类
     */
    private static class CustomAttributeProviderFactory implements AttributeProviderFactory {
        @Override
        public AttributeProvider create(AttributeProviderContext context) {
            return new CustomAttributeProvider();
        }
    }

    /**
     * 自定义属性提供器 - 处理特定标签的属性
     */
    private static class CustomAttributeProvider implements AttributeProvider {
        @Override
        public void setAttributes(Node node, String tagName, Map<String, String> attributes) {
            // 为链接添加 target="_blank" 属性，在新窗口打开
            if (node instanceof Link) {
                attributes.put("target", "_blank");
                // 为安全起见，添加 rel 属性
                attributes.put("rel", "noopener noreferrer");
            }

            // 为表格添加 CSS 类
            if (node instanceof TableBlock) {
                attributes.put("class", "ui celled table");
            }
        }
    }
}