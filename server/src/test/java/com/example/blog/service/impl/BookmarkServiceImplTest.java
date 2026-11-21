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
import com.example.blog.vo.BookmarkItemVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookmarkServiceImplTest {

    @Mock
    private BookmarkRepository bookmarkRepository;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private EssayRepository essayRepository;

    @Mock
    private DocRepository docRepository;

    private BookmarkServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BookmarkServiceImpl(bookmarkRepository, blogRepository, essayRepository, docRepository);
    }

    // ==================== 构造辅助 ====================

    private Blog blog(Long id, boolean published) {
        Blog blog = new Blog();
        blog.setId(id);
        blog.setTitle("博客 " + id);
        blog.setPublished(published);
        blog.setFirstPicture("cover.png");
        return blog;
    }

    private Essay essay(Long id, boolean published) {
        Essay essay = new Essay();
        essay.setId(id);
        essay.setTitle("随笔 " + id);
        essay.setPublished(published);
        essay.setImage("essay.png");
        return essay;
    }

    private Doc doc(String docId, boolean published) {
        Doc doc = new Doc();
        doc.setDocId(docId);
        doc.setTitle("文档 " + docId);
        doc.setPublished(published);
        return doc;
    }

    private Bookmark bookmark(Long id, BookmarkType type, String key, Date createTime) {
        Bookmark bookmark = new Bookmark();
        bookmark.setId(id);
        bookmark.setUserId(5L);
        bookmark.setContentType(type);
        bookmark.setContentKey(key);
        bookmark.setCreateTime(createTime);
        return bookmark;
    }

    // ==================== 添加 / 删除 ====================

    @Test
    void duplicateAddIsTreatedAsSuccess() {
        when(blogRepository.findById(1L)).thenReturn(Optional.of(blog(1L, true)));
        when(bookmarkRepository.save(any(Bookmark.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        assertDoesNotThrow(() -> service.add(5L, BookmarkType.BLOG, "1"));

        ArgumentCaptor<Bookmark> captor = ArgumentCaptor.forClass(Bookmark.class);
        verify(bookmarkRepository).save(captor.capture());
        assertEquals(BookmarkType.BLOG, captor.getValue().getContentType());
        assertEquals("1", captor.getValue().getContentKey());
    }

    @Test
    void addNormalizesNumericKey() {
        when(blogRepository.findById(12L)).thenReturn(Optional.of(blog(12L, true)));

        service.add(5L, BookmarkType.BLOG, " 012 ");

        ArgumentCaptor<Bookmark> captor = ArgumentCaptor.forClass(Bookmark.class);
        verify(bookmarkRepository).save(captor.capture());
        assertEquals("12", captor.getValue().getContentKey());
    }

    @Test
    void addUnpublishedBlogIsRejected() {
        when(blogRepository.findById(1L)).thenReturn(Optional.of(blog(1L, false)));

        assertThrows(IllegalArgumentException.class, () -> service.add(5L, BookmarkType.BLOG, "1"));
        verify(bookmarkRepository, never()).save(any());
    }

    @Test
    void addMissingContentIsRejected() {
        when(blogRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.add(5L, BookmarkType.BLOG, "1"));
        verify(bookmarkRepository, never()).save(any());
    }

    @Test
    void addInvalidNumericKeyIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.add(5L, BookmarkType.BLOG, "abc"));
        verifyNoInteractions(bookmarkRepository);
    }

    @Test
    void addDocRequiresPublishedDoc() {
        when(docRepository.findByDocId("doc-1")).thenReturn(Optional.of(doc("doc-1", true)));

        service.add(5L, BookmarkType.DOC, "doc-1");

        ArgumentCaptor<Bookmark> captor = ArgumentCaptor.forClass(Bookmark.class);
        verify(bookmarkRepository).save(captor.capture());
        assertEquals(BookmarkType.DOC, captor.getValue().getContentType());
        assertEquals("doc-1", captor.getValue().getContentKey());
    }

    @Test
    void removeMissingBookmarkSucceeds() {
        when(bookmarkRepository.findByUserIdAndContentTypeAndContentKey(5L, BookmarkType.BLOG, "1"))
                .thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.remove(5L, BookmarkType.BLOG, "1"));

        verify(bookmarkRepository, never()).delete(any(Bookmark.class));
    }

    @Test
    void removeExistingBookmarkDeletesIt() {
        Bookmark existing = bookmark(9L, BookmarkType.BLOG, "1", new Date());
        when(bookmarkRepository.findByUserIdAndContentTypeAndContentKey(5L, BookmarkType.BLOG, "1"))
                .thenReturn(Optional.of(existing));

        service.remove(5L, BookmarkType.BLOG, "1");

        verify(bookmarkRepository).delete(existing);
    }

    @Test
    void statusUsesNormalizedKey() {
        when(bookmarkRepository.existsByUserIdAndContentTypeAndContentKey(5L, BookmarkType.BLOG, "12"))
                .thenReturn(true);

        assertTrue(service.status(5L, BookmarkType.BLOG, " 12 "));
    }

    // ==================== 列表 ====================

    @Test
    void listSkipsUnpublishedContent() {
        Date now = new Date();
        when(bookmarkRepository.findByUserIdOrderByCreateTimeDesc(5L)).thenReturn(List.of(
                bookmark(1L, BookmarkType.BLOG, "1", now),
                bookmark(2L, BookmarkType.BLOG, "2", now)));
        when(blogRepository.findAllById(anyIterable()))
                .thenReturn(List.of(blog(1L, true), blog(2L, false)));

        List<BookmarkItemVO> items = service.list(5L, null);

        assertEquals(1, items.size());
        BookmarkItemVO item = items.get(0);
        assertEquals(BookmarkType.BLOG, item.getType());
        assertEquals("1", item.getKey());
        assertEquals("/blog/1/", item.getUrl());
    }

    @Test
    void listWithoutBookmarksReturnsEmpty() {
        when(bookmarkRepository.findByUserIdOrderByCreateTimeDesc(5L)).thenReturn(List.of());

        assertTrue(service.list(5L, null).isEmpty());
        verifyNoInteractions(blogRepository, essayRepository, docRepository);
    }

    @Test
    void listFiltersByType() {
        when(bookmarkRepository.findByUserIdAndContentTypeOrderByCreateTimeDesc(5L, BookmarkType.ESSAY))
                .thenReturn(List.of(bookmark(1L, BookmarkType.ESSAY, "3", new Date())));
        Essay essay = essay(3L, true);
        essay.setContent("<p>随笔正文</p>");
        when(essayRepository.findAllById(anyIterable())).thenReturn(List.of(essay));

        List<BookmarkItemVO> items = service.list(5L, BookmarkType.ESSAY);

        assertEquals(1, items.size());
        assertEquals("/essays/#3", items.get(0).getUrl());
        assertEquals("随笔正文", items.get(0).getSubtitle());
        assertEquals("essay.png", items.get(0).getCover());
    }

    @Test
    void listLoadsDocsInOneBatch() {
        when(bookmarkRepository.findByUserIdOrderByCreateTimeDesc(5L)).thenReturn(List.of(
                bookmark(1L, BookmarkType.DOC, "doc-a", new Date()),
                bookmark(2L, BookmarkType.DOC, "doc-b", new Date())));
        when(docRepository.findByDocIdIn(any())).thenReturn(List.of(doc("doc-a", true), doc("doc-b", true)));

        List<BookmarkItemVO> items = service.list(5L, null);

        assertEquals(2, items.size());
        assertEquals("/docs/doc-a/", items.get(0).getUrl());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(docRepository).findByDocIdIn(captor.capture());
        assertTrue(captor.getValue().containsAll(List.of("doc-a", "doc-b")));
    }

    @Test
    void listSkipsDeletedDocs() {
        when(bookmarkRepository.findByUserIdOrderByCreateTimeDesc(5L)).thenReturn(List.of(
                bookmark(1L, BookmarkType.DOC, "doc-a", new Date()),
                bookmark(2L, BookmarkType.DOC, "doc-b", new Date())));
        when(docRepository.findByDocIdIn(any())).thenReturn(List.of(doc("doc-a", true)));

        List<BookmarkItemVO> items = service.list(5L, null);

        assertEquals(1, items.size());
        assertEquals("doc-a", items.get(0).getKey());
    }

    @Test
    void listSkipsUnpublishedEssay() {
        when(bookmarkRepository.findByUserIdAndContentTypeOrderByCreateTimeDesc(5L, BookmarkType.ESSAY))
                .thenReturn(List.of(bookmark(1L, BookmarkType.ESSAY, "3", new Date())));
        when(essayRepository.findAllById(any())).thenReturn(List.of(essay(3L, false)));

        assertTrue(service.list(5L, BookmarkType.ESSAY).isEmpty());
    }

    @Test
    void blogSubtitleFallsBackToContentWhenDescriptionMissing() {
        when(bookmarkRepository.findByUserIdOrderByCreateTimeDesc(5L)).thenReturn(List.of(
                bookmark(1L, BookmarkType.BLOG, "1", new Date())));
        Blog blog = blog(1L, true);
        blog.setContent("<p>正文摘要</p>");
        when(blogRepository.findAllById(anyIterable())).thenReturn(List.of(blog));

        List<BookmarkItemVO> items = service.list(5L, null);

        assertEquals("正文摘要", items.get(0).getSubtitle());
    }
}
