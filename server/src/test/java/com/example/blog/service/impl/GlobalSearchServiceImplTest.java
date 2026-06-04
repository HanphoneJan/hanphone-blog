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
import com.example.blog.vo.SearchResultItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalSearchServiceImplTest {

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private EssayRepository essayRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private DocRepository docRepository;

    private GlobalSearchServiceImpl globalSearchService;

    @BeforeEach
    void setUp() {
        globalSearchService = new GlobalSearchServiceImpl(
                blogRepository, essayRepository, projectRepository, docRepository);
    }

    @Test
    void search_withEmptyQuery_returnsEmptyList() {
        List<SearchResultItem> results = globalSearchService.search("", 10);
        assertTrue(results.isEmpty());
    }

    @Test
    void search_withNullQuery_returnsEmptyList() {
        List<SearchResultItem> results = globalSearchService.search(null, 10);
        assertTrue(results.isEmpty());
    }

    @Test
    void search_withNoMatches_returnsEmptyList() {
        when(blogRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(essayRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(projectRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(docRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("nonexistent", 10);

        assertTrue(results.isEmpty());
    }

    @Test
    void search_sortsByScoreDescending() {
        // Doc with title + description match = score 5
        Doc doc = new Doc();
        doc.setId(1L);
        doc.setDocId("doc-1");
        doc.setTitle("Spring Guide");
        doc.setDescription("A comprehensive Spring tutorial");
        doc.setUpdateTime(LocalDateTime.of(2024, 1, 1, 0, 0));

        // Blog with title match only = score 3
        Blog blog = new Blog();
        blog.setId(2L);
        blog.setTitle("Spring Tips");
        blog.setDescription("Random description");
        blog.setContent("Some content");
        blog.setUpdateTime(new Date());

        // Essay with content match only = score 1
        Essay essay = new Essay();
        essay.setId(3L);
        essay.setTitle("Unrelated");
        essay.setContent("Spring is great");
        essay.setCreateTime(new Date());

        when(blogRepository.findAll(any(Specification.class))).thenReturn(List.of(blog));
        when(essayRepository.findAll(any(Specification.class))).thenReturn(List.of(essay));
        when(projectRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(docRepository.findAll(any(Specification.class))).thenReturn(List.of(doc));

        List<SearchResultItem> results = globalSearchService.search("spring", 10);

        assertEquals(3, results.size());
        // Doc should be first (score 5)
        assertEquals(ContentType.DOC, results.get(0).getContentType());
        assertEquals(5, results.get(0).getScore());
        // Blog should be second (score 3)
        assertEquals(ContentType.BLOG, results.get(1).getContentType());
        assertEquals(3, results.get(1).getScore());
        // Essay should be third (score 1)
        assertEquals(ContentType.ESSAY, results.get(2).getContentType());
        assertEquals(1, results.get(2).getScore());
    }

    @Test
    void search_respectsLimit() {
        Blog blog1 = new Blog();
        blog1.setId(1L);
        blog1.setTitle("Spring One");
        blog1.setDescription("Desc");
        blog1.setContent("Content");
        blog1.setUpdateTime(new Date());

        Blog blog2 = new Blog();
        blog2.setId(2L);
        blog2.setTitle("Spring Two");
        blog2.setDescription("Desc");
        blog2.setContent("Content");
        blog2.setUpdateTime(new Date());

        when(blogRepository.findAll(any(Specification.class))).thenReturn(List.of(blog1, blog2));
        when(essayRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(projectRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(docRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", 1);

        assertEquals(1, results.size());
    }

    @Test
    void search_returnsCorrectUrlsAndExternalFlags() {
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setTitle("Blog Title");
        blog.setDescription("Desc");
        blog.setContent("Content");
        blog.setUpdateTime(new Date());

        Essay essay = new Essay();
        essay.setId(2L);
        essay.setTitle("Essay Title");
        essay.setContent("Content");
        essay.setCreateTime(new Date());

        Project project = new Project();
        project.setId(3L);
        project.setTitle("Project Title");
        project.setContent("Content");
        project.setUrl("https://example.com");
        project.setTechs("Java");

        Doc doc = new Doc();
        doc.setId(4L);
        doc.setDocId("abc123");
        doc.setTitle("Doc Title");
        doc.setDescription("Desc");
        doc.setUpdateTime(LocalDateTime.now());

        when(blogRepository.findAll(any(Specification.class))).thenReturn(List.of(blog));
        when(essayRepository.findAll(any(Specification.class))).thenReturn(List.of(essay));
        when(projectRepository.findAll(any(Specification.class))).thenReturn(List.of(project));
        when(docRepository.findAll(any(Specification.class))).thenReturn(List.of(doc));

        List<SearchResultItem> results = globalSearchService.search("title", 10);

        SearchResultItem blogItem = results.stream()
                .filter(r -> r.getContentType() == ContentType.BLOG)
                .findFirst()
                .orElseThrow();
        assertEquals("/blog/1", blogItem.getUrl());
        assertFalse(blogItem.isExternal());

        SearchResultItem essayItem = results.stream()
                .filter(r -> r.getContentType() == ContentType.ESSAY)
                .findFirst()
                .orElseThrow();
        assertEquals("/essays#2", essayItem.getUrl());
        assertFalse(essayItem.isExternal());

        SearchResultItem projectItem = results.stream()
                .filter(r -> r.getContentType() == ContentType.PROJECT)
                .findFirst()
                .orElseThrow();
        assertEquals("https://example.com", projectItem.getUrl());
        assertTrue(projectItem.isExternal());

        SearchResultItem docItem = results.stream()
                .filter(r -> r.getContentType() == ContentType.DOC)
                .findFirst()
                .orElseThrow();
        assertEquals("/docs/abc123", docItem.getUrl());
        assertFalse(docItem.isExternal());
    }

    @Test
    void search_handlesNullDescription() {
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setTitle("Title");
        blog.setDescription(null);
        blog.setContent("Content");
        blog.setUpdateTime(new Date());

        when(blogRepository.findAll(any(Specification.class))).thenReturn(List.of(blog));
        when(essayRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(projectRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(docRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("title", 10);

        assertEquals(1, results.size());
        assertEquals("Title", results.get(0).getTitle());
        assertNull(results.get(0).getDescription());
        assertEquals(3, results.get(0).getScore()); // title match only
    }

    @Test
    void search_essayWithTitleMatchOnly_hasScore3() {
        Essay essay = new Essay();
        essay.setId(1L);
        essay.setTitle("Spring Essay");
        essay.setContent("Unrelated content");
        essay.setCreateTime(new Date());

        when(blogRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(essayRepository.findAll(any(Specification.class))).thenReturn(List.of(essay));
        when(projectRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(docRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", 10);

        assertEquals(1, results.size());
        assertEquals(ContentType.ESSAY, results.get(0).getContentType());
        assertEquals(3, results.get(0).getScore());
    }
}
