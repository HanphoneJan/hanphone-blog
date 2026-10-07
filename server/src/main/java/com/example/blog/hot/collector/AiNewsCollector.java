package com.example.blog.hot.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.collector.HttpJsonSupport;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * AI 领域重大新闻采集器（RSS/Atom）。
 *
 * <p>聚合中文与英文的高信号 AI 资讯源；Hacker News 首页按 AI 关键词过滤。</p>
 */
@Component
public class AiNewsCollector implements HotCollector {

    private static final Log log = LogFactory.getLog(AiNewsCollector.class);
    private static final int MAX_ITEMS = 40;

    private record Feed(String name, String url, boolean aiFilter) {
    }

    private static final List<Feed> FEEDS = List.of(
            new Feed("量子位", "https://www.qbitai.com/feed", false),
            new Feed("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", false),
            new Feed("Ars Technica AI", "https://arstechnica.com/ai/feed/", false),
            new Feed("Hacker News", "https://hnrss.org/frontpage", true)
    );

    private static final List<String> AI_KEYWORDS = List.of(
            " ai ", "ai ", " ai", "llm", "gpt", "openai", "anthropic", "claude", "gemini", "deepseek",
            "qwen", "llama", "mistral", "model", "agent", "neural", "machine learning", "robot",
            "nvidia", "transformer", "diffusion", "chatgpt", "copilot", "embedding", "rag");

    private final HttpJsonSupport http;

    public AiNewsCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.AI_NEWS;
    }

    @Override
    public String category() {
        return HotSourceKeys.CATEGORY_AI_NEWS;
    }

    @Override
    public String displayName() {
        return "AI 要闻";
    }

    @Override
    public String sourceUrl() {
        return "https://www.qbitai.com/";
    }

    @Override
    public List<HotItemData> fetch() {
        Map<String, HotItemData> byUrl = new LinkedHashMap<>();
        for (Feed feed : FEEDS) {
            try {
                for (HotItemData item : parseFeed(feed)) {
                    byUrl.putIfAbsent(item.url(), item);
                }
            } catch (Exception e) {
                log.warn("AI 要闻采集失败 " + feed.name() + "：" + e.getMessage());
            }
        }
        List<HotItemData> out = new ArrayList<>(byUrl.values());
        out.sort(Comparator.comparing(HotItemData::publishedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        if (out.size() > MAX_ITEMS) {
            out = new ArrayList<>(out.subList(0, MAX_ITEMS));
        }
        return out;
    }

    private List<HotItemData> parseFeed(Feed feed) throws Exception {
        String xml = http.getRaw(feed.url(), null,
                List.of(MediaType.APPLICATION_XML, MediaType.parseMediaType("application/rss+xml")));
        Document doc = parseXml(xml);
        List<HotItemData> out = new ArrayList<>();

        NodeList items = doc.getElementsByTagName("item");
        if (items.getLength() == 0) {
            items = doc.getElementsByTagName("entry"); // Atom
        }
        for (int i = 0; i < items.getLength(); i++) {
            Element el = (Element) items.item(i);
            String title = text(el, "title");
            String link = text(el, "link");
            if (link == null || link.isBlank()) {
                // Atom: <link href="..."/>
                link = attr(el, "link", "href");
            }
            if (title == null || title.isBlank() || link == null || link.isBlank()) {
                continue;
            }
            if (feed.aiFilter() && !isAiRelated(title)) {
                continue;
            }
            String summary = firstNonBlank(text(el, "description"), text(el, "summary"), text(el, "content"));
            Date published = parseDate(firstNonBlank(text(el, "pubDate"), text(el, "published"),
                    text(el, "updated"), text(el, "dc:date")));

            out.add(new HotItemData(
                    HotSourceKeys.CATEGORY_AI_NEWS,
                    "news:" + link,
                    clean(title),
                    link.trim(),
                    feed.name(),
                    feed.name(),
                    null,
                    null,
                    summary == null ? null : clean(summary),
                    published
            ));
        }
        return out;
    }

    private Document parseXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder()
                .parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
    }

    private boolean isAiRelated(String title) {
        String lower = title.toLowerCase(Locale.ROOT);
        return AI_KEYWORDS.stream().anyMatch(lower::contains);
    }

    private String text(Element el, String tag) {
        NodeList list = el.getElementsByTagName(tag);
        for (int i = 0; i < list.getLength(); i++) {
            Node node = list.item(i);
            if (node.getParentNode() == el && node.getTextContent() != null) {
                return node.getTextContent();
            }
        }
        return list.getLength() > 0 ? list.item(0).getTextContent() : null;
    }

    private String attr(Element el, String tag, String attrName) {
        NodeList list = el.getElementsByTagName(tag);
        if (list.getLength() == 0) {
            return null;
        }
        Node node = list.item(0);
        if (node instanceof Element e && e.hasAttribute(attrName)) {
            return e.getAttribute(attrName);
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }

    private String clean(String raw) {
        String s = raw.replaceAll("<[^>]+>", " ")
                .replaceAll("&[a-zA-Z#0-9]+;", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return s.length() > 300 ? s.substring(0, 300) : s;
    }

    private Date parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Date.from(ZonedDateTime.parse(value.trim(), DateTimeFormatter.RFC_1123_DATE_TIME)
                    .toInstant());
        } catch (Exception ignored) {
            // fall through
        }
        try {
            return Date.from(OffsetDateTime.parse(value.trim()).toInstant());
        } catch (Exception ignored) {
            return null;
        }
    }
}
