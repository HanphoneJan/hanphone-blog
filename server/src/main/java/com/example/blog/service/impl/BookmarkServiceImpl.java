package com.example.blog.service.impl;

import com.example.blog.dao.BlogRepository;
import com.example.blog.dao.BookmarkRepository;
import com.example.blog.dao.DocRepository;
import com.example.blog.dao.EssayRepository;
import com.example.blog.enums.BookmarkType;
import com.example.blog.po.Blog;
import com.example.blog.po.Bookmark;
import com.example.blog.po.Doc;
import com.example.blog.po.Essay;
import com.example.blog.service.BookmarkService;
import com.example.blog.vo.BookmarkItemVO;
import org.jsoup.Jsoup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class BookmarkServiceImpl implements BookmarkService {

    private static final Logger log = LoggerFactory.getLogger(BookmarkServiceImpl.class);

    private static final int SUBTITLE_LENGTH = 80;

    private final BookmarkRepository bookmarkRepository;
    private final BlogRepository blogRepository;
    private final EssayRepository essayRepository;
    private final DocRepository docRepository;

    public BookmarkServiceImpl(BookmarkRepository bookmarkRepository,
                               BlogRepository blogRepository,
                               EssayRepository essayRepository,
                               DocRepository docRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.blogRepository = blogRepository;
        this.essayRepository = essayRepository;
        this.docRepository = docRepository;
    }

    @Override
    public void add(Long userId, BookmarkType type, String key) {
        String normalizedKey = normalizeKey(type, key);
        requirePublishedContent(type, normalizedKey);

        Bookmark bookmark = new Bookmark();
        bookmark.setUserId(userId);
        bookmark.setContentType(type);
        bookmark.setContentKey(normalizedKey);
        bookmark.setCreateTime(new java.util.Date());

        try {
            // 不加事务：唯一约束冲突在 repository 自己的事务里回滚，这里捕获后按成功处理
            bookmarkRepository.save(bookmark);
        } catch (DataIntegrityViolationException e) {
            // 重复收藏：唯一约束 uk_bookmark_user_type_key 命中，幂等返回成功
            log.debug("重复收藏，忽略: userId={}, type={}, key={}", userId, type, normalizedKey);
        }
    }

    @Override
    @Transactional
    public void remove(Long userId, BookmarkType type, String key) {
        String normalizedKey = normalizeKey(type, key);
        bookmarkRepository.findByUserIdAndContentTypeAndContentKey(userId, type, normalizedKey)
                .ifPresent(bookmarkRepository::delete);
    }

    @Override
    public List<BookmarkItemVO> list(Long userId, BookmarkType typeOrNull) {
        List<Bookmark> bookmarks = typeOrNull == null
                ? bookmarkRepository.findByUserIdOrderByCreateTimeDesc(userId)
                : bookmarkRepository.findByUserIdAndContentTypeOrderByCreateTimeDesc(userId, typeOrNull);
        if (bookmarks == null || bookmarks.isEmpty()) {
            return new ArrayList<>();
        }

        Set<Long> blogIds = new HashSet<>();
        Set<Long> essayIds = new HashSet<>();
        Set<String> docIds = new HashSet<>();
        for (Bookmark bookmark : bookmarks) {
            if (bookmark == null || bookmark.getContentType() == null) {
                continue;
            }
            switch (bookmark.getContentType()) {
                case BLOG -> {
                    Long id = parseIdOrNull(bookmark.getContentKey());
                    if (id != null) {
                        blogIds.add(id);
                    }
                }
                case ESSAY -> {
                    Long id = parseIdOrNull(bookmark.getContentKey());
                    if (id != null) {
                        essayIds.add(id);
                    }
                }
                case DOC -> {
                    if (bookmark.getContentKey() != null) {
                        docIds.add(bookmark.getContentKey());
                    }
                }
            }
        }

        // 批量回表，避免 N+1
        Map<Long, Blog> blogs = new HashMap<>();
        if (!blogIds.isEmpty()) {
            for (Blog blog : blogRepository.findAllById(blogIds)) {
                blogs.put(blog.getId(), blog);
            }
        }
        Map<Long, Essay> essays = new HashMap<>();
        if (!essayIds.isEmpty()) {
            for (Essay essay : essayRepository.findAllById(essayIds)) {
                essays.put(essay.getId(), essay);
            }
        }
        Map<String, Doc> docs = new HashMap<>();
        if (!docIds.isEmpty()) {
            for (Doc doc : docRepository.findByDocIdIn(docIds)) {
                docs.put(doc.getDocId(), doc);
            }
        }

        List<BookmarkItemVO> items = new ArrayList<>(bookmarks.size());
        for (Bookmark bookmark : bookmarks) {
            BookmarkItemVO item = toItem(bookmark, blogs, essays, docs);
            // 内容已删除 / 未发布：跳过
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    @Override
    public boolean status(Long userId, BookmarkType type, String key) {
        return bookmarkRepository.existsByUserIdAndContentTypeAndContentKey(userId, type, normalizeKey(type, key));
    }

    // ==================== 内部方法 ====================

    /**
     * 校验内容存在且已发布；不存在 / 未发布时抛 {@link IllegalArgumentException}（控制器映射为 400）。
     */
    private void requirePublishedContent(BookmarkType type, String key) {
        switch (type) {
            case BLOG -> {
                Long id = parseId(key);
                Blog blog = blogRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("博客不存在或已下线"));
                if (!blog.isPublished()) {
                    throw new IllegalArgumentException("博客不存在或已下线");
                }
            }
            case ESSAY -> {
                Long id = parseId(key);
                Essay essay = essayRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("随笔不存在或已下线"));
                if (!Boolean.TRUE.equals(essay.getPublished())) {
                    throw new IllegalArgumentException("随笔不存在或已下线");
                }
            }
            case DOC -> {
                Doc doc = docRepository.findByDocId(key)
                        .orElseThrow(() -> new IllegalArgumentException("文档不存在或已下线"));
                if (!Boolean.TRUE.equals(doc.getPublished())) {
                    throw new IllegalArgumentException("文档不存在或已下线");
                }
            }
            default -> throw new IllegalArgumentException("不支持的收藏类型");
        }
    }

    /**
     * 统一 key 形式：BLOG / ESSAY 归一为数值字符串（"012" → "12"），DOC 去空格。
     */
    private String normalizeKey(BookmarkType type, String key) {
        if (type == null) {
            throw new IllegalArgumentException("收藏类型不能为空");
        }
        if (key == null || key.trim().isEmpty()) {
            throw new IllegalArgumentException("收藏内容 key 不能为空");
        }
        String trimmed = key.trim();
        return switch (type) {
            case BLOG, ESSAY -> String.valueOf(parseId(trimmed));
            case DOC -> trimmed;
        };
    }

    private Long parseId(String key) {
        try {
            return Long.valueOf(key);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("收藏内容 key 格式错误");
        }
    }

    private Long parseIdOrNull(String key) {
        if (key == null) {
            return null;
        }
        try {
            return Long.valueOf(key.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BookmarkItemVO toItem(Bookmark bookmark,
                                  Map<Long, Blog> blogs,
                                  Map<Long, Essay> essays,
                                  Map<String, Doc> docs) {
        BookmarkType type = bookmark.getContentType();
        if (type == null) {
            return null;
        }
        String key = bookmark.getContentKey();
        switch (type) {
            case BLOG -> {
                Long id = parseIdOrNull(key);
                Blog blog = id != null ? blogs.get(id) : null;
                if (blog == null || !blog.isPublished()) {
                    return null;
                }
                return new BookmarkItemVO(BookmarkType.BLOG, String.valueOf(id), blog.getTitle(),
                        subtitle(blog.getDescription(), blog.getContent()), blog.getFirstPicture(),
                        "/blog/" + id + "/", bookmark.getCreateTime());
            }
            case ESSAY -> {
                Long id = parseIdOrNull(key);
                Essay essay = id != null ? essays.get(id) : null;
                if (essay == null || !Boolean.TRUE.equals(essay.getPublished())) {
                    return null;
                }
                return new BookmarkItemVO(BookmarkType.ESSAY, String.valueOf(id), essay.getTitle(),
                        subtitle(null, essay.getContent()), essay.getImage(),
                        "/essays/#" + id, bookmark.getCreateTime());
            }
            case DOC -> {
                Doc doc = docs.get(key);
                if (doc == null || !Boolean.TRUE.equals(doc.getPublished())) {
                    return null;
                }
                return new BookmarkItemVO(BookmarkType.DOC, doc.getDocId(), doc.getTitle(),
                        subtitle(doc.getDescription(), null), null,
                        "/docs/" + doc.getDocId() + "/", bookmark.getCreateTime());
            }
            default -> {
                return null;
            }
        }
    }

    /**
     * 优先 description；缺失时用 content 去 HTML 后的前 {@value #SUBTITLE_LENGTH} 字。
     */
    private String subtitle(String description, String content) {
        if (description != null && !description.trim().isEmpty()) {
            return description.trim();
        }
        if (content == null) {
            return null;
        }
        String text = Jsoup.parse(content).text().trim();
        if (text.isEmpty()) {
            return null;
        }
        return text.length() > SUBTITLE_LENGTH ? text.substring(0, SUBTITLE_LENGTH) : text;
    }
}
