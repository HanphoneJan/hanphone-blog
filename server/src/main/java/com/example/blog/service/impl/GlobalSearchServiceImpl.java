package com.example.blog.service.impl;

import com.example.blog.dao.BlogRepository;
import com.example.blog.dao.DocRepository;
import com.example.blog.dao.EssayRepository;
import com.example.blog.dao.ProjectRepository;
import com.example.blog.enums.ContentType;
import com.example.blog.po.Blog;
import com.example.blog.po.Doc;
import com.example.blog.po.Essay;
import com.example.blog.po.Project;
import com.example.blog.service.GlobalSearchService;
import com.example.blog.vo.SearchResultItem;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class GlobalSearchServiceImpl implements GlobalSearchService {

    /** 摘要中关键词前后保留的字符数 */
    private static final int SNIPPET_RADIUS = 40;
    /** 关键词未命中时摘要取前 N 个字符 */
    private static final int SNIPPET_FALLBACK_LENGTH = 80;

    private static final int TITLE_SCORE = 30;
    private static final int DESCRIPTION_SCORE = 20;
    private static final int TECHS_SCORE = 20;
    private static final int CONTENT_SCORE = 10;

    private static final String ELLIPSIS = "…";

    private final BlogRepository blogRepository;
    private final EssayRepository essayRepository;
    private final ProjectRepository projectRepository;
    private final DocRepository docRepository;

    public GlobalSearchServiceImpl(BlogRepository blogRepository,
                                   EssayRepository essayRepository,
                                   ProjectRepository projectRepository,
                                   DocRepository docRepository) {
        this.blogRepository = Objects.requireNonNull(blogRepository, "blogRepository must not be null");
        this.essayRepository = Objects.requireNonNull(essayRepository, "essayRepository must not be null");
        this.projectRepository = Objects.requireNonNull(projectRepository, "projectRepository must not be null");
        this.docRepository = Objects.requireNonNull(docRepository, "docRepository must not be null");
    }

    @Override
    public List<SearchResultItem> search(String query, String type, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        ContentType contentType = parseType(type);

        String keyword = query.trim();
        String keywordPattern = "%" + keyword + "%";
        int effectiveLimit = Math.max(1, limit);

        List<SearchResultItem> results = new ArrayList<>();
        if (contentType == null || contentType == ContentType.BLOG) {
            results.addAll(searchBlogs(keyword, keywordPattern, effectiveLimit));
        }
        if (contentType == null || contentType == ContentType.ESSAY) {
            results.addAll(searchEssays(keyword, keywordPattern, effectiveLimit));
        }
        if (contentType == null || contentType == ContentType.PROJECT) {
            results.addAll(searchProjects(keyword, keywordPattern, effectiveLimit));
        }
        if (contentType == null || contentType == ContentType.DOC) {
            results.addAll(searchDocs(keyword, keywordPattern, effectiveLimit));
        }

        return results.stream()
                .sorted(Comparator
                        .comparingInt(SearchResultItem::getScore).reversed()
                        .thenComparing(SearchResultItem::getUpdateTime,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(effectiveLimit)
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchBlogs(String keyword, String keywordPattern, int limit) {
        return blogRepository.searchTop(keywordPattern, limit).stream()
                .map(blog -> {
                    int score = scoreOf(keyword, blog.getTitle(), TITLE_SCORE)
                            + scoreOf(keyword, blog.getDescription(), DESCRIPTION_SCORE)
                            + scoreOf(keyword, blog.getContent(), CONTENT_SCORE);

                    return new SearchResultItem(
                            blog.getId(),
                            blog.getTitle(),
                            blog.getDescription(),
                            ContentType.BLOG,
                            "/blog/" + blog.getId(),
                            false,
                            score,
                            toLocalDateTime(blog.getUpdateTime() != null ? blog.getUpdateTime() : blog.getCreateTime()),
                            buildSnippet(keyword, blog.getContent(), blog.getDescription())
                    );
                })
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchEssays(String keyword, String keywordPattern, int limit) {
        return essayRepository.searchTop(keywordPattern, limit).stream()
                .map(essay -> {
                    int score = scoreOf(keyword, essay.getTitle(), TITLE_SCORE)
                            + scoreOf(keyword, essay.getContent(), CONTENT_SCORE);

                    return new SearchResultItem(
                            essay.getId(),
                            essay.getTitle(),
                            null,
                            ContentType.ESSAY,
                            "/essays#" + essay.getId(),
                            false,
                            score,
                            toLocalDateTime(essay.getCreateTime()),
                            buildSnippet(keyword, essay.getContent())
                    );
                })
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchProjects(String keyword, String keywordPattern, int limit) {
        return projectRepository.searchTop(keywordPattern, limit).stream()
                .map(project -> {
                    int score = scoreOf(keyword, project.getTitle(), TITLE_SCORE)
                            + scoreOf(keyword, project.getTechs(), TECHS_SCORE)
                            + scoreOf(keyword, project.getContent(), CONTENT_SCORE);

                    return new SearchResultItem(
                            project.getId(),
                            project.getTitle(),
                            null,
                            ContentType.PROJECT,
                            project.getUrl(),
                            true,
                            score,
                            toLocalDateTime(project.getUpdateTime() != null ? project.getUpdateTime() : project.getCreatedTime()),
                            buildSnippet(keyword, project.getContent(), project.getTechs())
                    );
                })
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchDocs(String keyword, String keywordPattern, int limit) {
        return docRepository.searchTop(keywordPattern, limit).stream()
                .map(doc -> {
                    int score = scoreOf(keyword, doc.getTitle(), TITLE_SCORE)
                            + scoreOf(keyword, doc.getDescription(), DESCRIPTION_SCORE);

                    return new SearchResultItem(
                            doc.getId(),
                            doc.getTitle(),
                            doc.getDescription(),
                            ContentType.DOC,
                            "/docs/" + doc.getDocId(),
                            false,
                            score,
                            doc.getUpdateTime() != null ? doc.getUpdateTime() : doc.getCreateTime(),
                            // Doc 没有正文，摘要取描述
                            buildSnippet(keyword, doc.getDescription())
                    );
                })
                .collect(Collectors.toList());
    }

    /**
     * 解析搜索类型：null/空返回 null 表示全部；非法值抛 {@link IllegalArgumentException} 由控制器映射为业务错误。
     */
    private ContentType parseType(String type) {
        if (type == null || type.trim().isEmpty()) {
            return null;
        }
        try {
            return ContentType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("不支持的搜索类型: " + type, ex);
        }
    }

    private int scoreOf(String keyword, String text, int weight) {
        return containsIgnoreCase(text, keyword) ? weight : 0;
    }

    private boolean containsIgnoreCase(String text, String keyword) {
        return text != null && text.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    /**
     * 生成纯文本摘要：先用 Jsoup 去掉 HTML（防 XSS / 标签泄漏），再取关键词前后各 40 字；
     * 关键词未命中时取前 80 字。多个候选文本时优先选命中关键词的那一段。
     */
    private String buildSnippet(String keyword, String... candidates) {
        String lowerKeyword = keyword.toLowerCase(Locale.ROOT);
        List<String> plainTexts = new ArrayList<>();

        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }
            String plain = Jsoup.parse(candidate).text();
            if (plain.isBlank()) {
                continue;
            }
            plainTexts.add(plain);

            int index = plain.toLowerCase(Locale.ROOT).indexOf(lowerKeyword);
            if (index >= 0) {
                return excerpt(plain, index, keyword.length());
            }
        }

        return plainTexts.isEmpty() ? null : truncate(plainTexts.get(0));
    }

    private String excerpt(String text, int index, int keywordLength) {
        int start = Math.max(0, index - SNIPPET_RADIUS);
        int end = Math.min(text.length(), index + keywordLength + SNIPPET_RADIUS);

        StringBuilder sb = new StringBuilder();
        if (start > 0) {
            sb.append(ELLIPSIS);
        }
        sb.append(text, start, end);
        if (end < text.length()) {
            sb.append(ELLIPSIS);
        }
        return sb.toString();
    }

    private String truncate(String text) {
        if (text.length() <= SNIPPET_FALLBACK_LENGTH) {
            return text;
        }
        return text.substring(0, SNIPPET_FALLBACK_LENGTH) + ELLIPSIS;
    }

    private LocalDateTime toLocalDateTime(Date date) {
        if (date == null) {
            return null;
        }
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
}
