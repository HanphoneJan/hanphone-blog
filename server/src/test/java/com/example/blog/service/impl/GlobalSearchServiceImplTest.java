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
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    // ---------------------------------------------------------------- 基础行为

    @Test
    void search_withEmptyQuery_returnsEmptyList() {
        List<SearchResultItem> results = globalSearchService.search("  ", null, 10);
        assertTrue(results.isEmpty());
        verify(blogRepository, never()).searchTop(anyString(), anyInt());
    }

    @Test
    void search_withNullQuery_returnsEmptyList() {
        List<SearchResultItem> results = globalSearchService.search(null, null, 10);
        assertTrue(results.isEmpty());
        verify(blogRepository, never()).searchTop(anyString(), anyInt());
    }

    @Test
    void search_withNoMatches_returnsEmptyList() {
        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("nonexistent", null, 10);

        assertTrue(results.isEmpty());
    }

    @Test
    void search_passesLikePatternAndLimitToRepositories() {
        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        globalSearchService.search(" Spring ", null, 7);

        verify(blogRepository).searchTop("%Spring%", 7);
        verify(essayRepository).searchTop("%Spring%", 7);
        verify(projectRepository).searchTop("%Spring%", 7);
        verify(docRepository).searchTop("%Spring%", 7);
    }

    // ---------------------------------------------------------------- 评分与排序

    @Test
    void search_sortsByScoreDescending() {
        // Doc: title 30 + description 20 = 50
        Doc doc = new Doc();
        doc.setId(1L);
        doc.setDocId("doc-1");
        doc.setTitle("Spring Guide");
        doc.setDescription("A comprehensive Spring tutorial");
        doc.setUpdateTime(LocalDateTime.of(2024, 1, 1, 0, 0));

        // Blog: title 30 only
        Blog blog = new Blog();
        blog.setId(2L);
        blog.setTitle("Spring Tips");
        blog.setDescription("Random description");
        blog.setContent("Some content");
        blog.setUpdateTime(new Date());

        // Essay: content 10 only
        Essay essay = new Essay();
        essay.setId(3L);
        essay.setTitle("Unrelated");
        essay.setContent("Spring is great");
        essay.setCreateTime(new Date());

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(blog));
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(essay));
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(doc));

        List<SearchResultItem> results = globalSearchService.search("spring", null, 10);

        assertEquals(3, results.size());
        assertEquals(ContentType.DOC, results.get(0).getContentType());
        assertEquals(50, results.get(0).getScore());
        assertEquals(ContentType.BLOG, results.get(1).getContentType());
        assertEquals(30, results.get(1).getScore());
        assertEquals(ContentType.ESSAY, results.get(2).getContentType());
        assertEquals(10, results.get(2).getScore());
    }

    @Test
    void search_projectScoresTechs20AndContent10() {
        Project project = new Project();
        project.setId(9L);
        project.setTitle("Awesome Tool");
        project.setContent("A tool about Spring");
        project.setTechs("Spring");
        project.setUrl("https://example.com");
        project.setCreatedTime(new Date());

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(project));
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", null, 10);

        assertEquals(1, results.size());
        // techs 20 + content 10，标题未命中
        assertEquals(30, results.get(0).getScore());
    }

    @Test
    void search_sameScore_sortsByUpdateTimeDescending() {
        Blog older = blog(1L, "Spring Old", "content", date(2023, 1, 1));
        Blog newer = blog(2L, "Spring New", "content", date(2024, 6, 1));

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(older, newer));
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", null, 10);

        assertEquals(2, results.size());
        assertEquals(2L, results.get(0).getId());
        assertEquals(1L, results.get(1).getId());
    }

    @Test
    void search_respectsLimit() {
        Blog blog1 = blog(1L, "Spring One", "Content", new Date());
        Blog blog2 = blog(2L, "Spring Two", "Content", new Date());

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(blog1, blog2));
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", null, 1);

        assertEquals(1, results.size());
        verify(blogRepository).searchTop("%spring%", 1);
    }

    @Test
    void search_nonPositiveLimit_treatedAsOne() {
        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(blog(1L, "Spring", "c", new Date())));
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", null, 0);

        assertEquals(1, results.size());
        verify(blogRepository).searchTop("%spring%", 1);
    }

    // ---------------------------------------------------------------- 类型过滤

    @Test
    void search_withBlogType_onlyQueriesBlogRepository() {
        when(blogRepository.searchTop(anyString(), anyInt()))
                .thenReturn(List.of(blog(1L, "Spring", "c", new Date())));

        List<SearchResultItem> results = globalSearchService.search("spring", "BLOG", 10);

        assertEquals(1, results.size());
        assertEquals(ContentType.BLOG, results.get(0).getContentType());
        verify(essayRepository, never()).searchTop(anyString(), anyInt());
        verify(projectRepository, never()).searchTop(anyString(), anyInt());
        verify(docRepository, never()).searchTop(anyString(), anyInt());
    }

    @Test
    void search_typeIsCaseInsensitiveAndTrimmed() {
        when(essayRepository.searchTop(anyString(), anyInt()))
                .thenReturn(List.of(essay(5L, "Spring Essay", "body")));

        List<SearchResultItem> results = globalSearchService.search("spring", "  essay ", 10);

        assertEquals(1, results.size());
        assertEquals(ContentType.ESSAY, results.get(0).getContentType());
        verify(blogRepository, never()).searchTop(anyString(), anyInt());
        verify(projectRepository, never()).searchTop(anyString(), anyInt());
        verify(docRepository, never()).searchTop(anyString(), anyInt());
    }

    @Test
    void search_withDocType_onlyQueriesDocRepository() {
        Doc doc = new Doc();
        doc.setId(4L);
        doc.setDocId("abc123");
        doc.setTitle("Doc Title");
        doc.setDescription("Spring notes");
        doc.setUpdateTime(LocalDateTime.now());

        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(doc));

        List<SearchResultItem> results = globalSearchService.search("spring", "DOC", 10);

        assertEquals(1, results.size());
        assertEquals(ContentType.DOC, results.get(0).getContentType());
        verify(blogRepository, never()).searchTop(anyString(), anyInt());
        verify(essayRepository, never()).searchTop(anyString(), anyInt());
        verify(projectRepository, never()).searchTop(anyString(), anyInt());
    }

    @Test
    void search_withUnsupportedType_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> globalSearchService.search("spring", "COMMENT", 10));
        assertThrows(IllegalArgumentException.class,
                () -> globalSearchService.search("spring", "BOOKMARK", 10));
        verify(blogRepository, never()).searchTop(anyString(), anyInt());
    }

    @Test
    void search_withNullType_queriesAllRepositories() {
        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        globalSearchService.search("spring", null, 10);

        verify(blogRepository).searchTop("%spring%", 10);
        verify(essayRepository).searchTop("%spring%", 10);
        verify(projectRepository).searchTop("%spring%", 10);
        verify(docRepository).searchTop("%spring%", 10);
    }

    // ---------------------------------------------------------------- URL / 空值

    @Test
    void search_returnsCorrectUrlsAndExternalFlags() {
        Blog blog = blog(1L, "Blog Title", "Content", new Date());

        Essay essay = essay(2L, "Essay Title", "Content");

        Project project = new Project();
        project.setId(3L);
        project.setTitle("Project Title");
        project.setContent("Content");
        project.setUrl("https://example.com");
        project.setTechs("Java");
        project.setCreatedTime(new Date());

        Doc doc = new Doc();
        doc.setId(4L);
        doc.setDocId("abc123");
        doc.setTitle("Doc Title");
        doc.setDescription("Desc");
        doc.setUpdateTime(LocalDateTime.now());

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(blog));
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(essay));
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(project));
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(doc));

        List<SearchResultItem> results = globalSearchService.search("title", null, 10);

        SearchResultItem blogItem = byType(results, ContentType.BLOG);
        assertEquals("/blog/1", blogItem.getUrl());
        assertFalse(blogItem.isExternal());

        SearchResultItem essayItem = byType(results, ContentType.ESSAY);
        assertEquals("/essays#2", essayItem.getUrl());
        assertFalse(essayItem.isExternal());

        SearchResultItem projectItem = byType(results, ContentType.PROJECT);
        assertEquals("https://example.com", projectItem.getUrl());
        assertTrue(projectItem.isExternal());

        SearchResultItem docItem = byType(results, ContentType.DOC);
        assertEquals("/docs/abc123", docItem.getUrl());
        assertFalse(docItem.isExternal());
    }

    @Test
    void search_handlesNullDescription() {
        Blog blog = blog(1L, "Title", "Content", new Date());
        blog.setDescription(null);

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(blog));
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("title", null, 10);

        assertEquals(1, results.size());
        assertEquals("Title", results.get(0).getTitle());
        assertNull(results.get(0).getDescription());
        assertEquals(30, results.get(0).getScore());
    }

    @Test
    void search_essayWithTitleMatchOnly_hasScore30() {
        Essay essay = essay(1L, "Spring Essay", "Unrelated content");

        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(essay));
        when(projectRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(Collections.emptyList());

        List<SearchResultItem> results = globalSearchService.search("spring", null, 10);

        assertEquals(1, results.size());
        assertEquals(ContentType.ESSAY, results.get(0).getContentType());
        assertEquals(30, results.get(0).getScore());
    }

    // ---------------------------------------------------------------- snippet

    @Test
    void search_snippetStripsHtmlTags() {
        Blog blog = blog(1L, "Post", "<p>Hello <strong>Spring</strong> world</p>", new Date());
        blog.setDescription("<em>desc</em>");

        stubOnlyBlog(blog);

        SearchResultItem item = globalSearchService.search("spring", "BLOG", 10).get(0);

        assertNotNull(item.getSnippet());
        assertTrue(item.getSnippet().contains("Spring"));
        assertFalse(item.getSnippet().contains("<"));
        assertFalse(item.getSnippet().contains(">"));
    }

    @Test
    void search_snippetAddsEllipsisAroundKeyword() {
        String content = "A".repeat(100) + " Spring " + "B".repeat(100);
        Blog blog = blog(1L, "Post", content, new Date());

        stubOnlyBlog(blog);

        String snippet = globalSearchService.search("spring", "BLOG", 10).get(0).getSnippet();

        assertNotNull(snippet);
        assertTrue(snippet.startsWith("…"), snippet);
        assertTrue(snippet.endsWith("…"), snippet);
        assertTrue(snippet.contains("Spring"), snippet);
        assertTrue(snippet.length() < content.length());
    }

    @Test
    void search_snippetFallsBackToPrefixWhenKeywordOnlyInTitle() {
        Blog blog = blog(1L, "Spring", "<p>body without the word</p>", new Date());

        stubOnlyBlog(blog);

        String snippet = globalSearchService.search("spring", "BLOG", 10).get(0).getSnippet();

        assertEquals("body without the word", snippet);
    }

    @Test
    void search_docSnippetUsesDescription() {
        Doc doc = new Doc();
        doc.setId(1L);
        doc.setDocId("d1");
        doc.setTitle("Notes");
        doc.setDescription("<p>A document about <b>Spring</b> Boot</p>");
        doc.setUpdateTime(LocalDateTime.now());

        when(docRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(doc));

        SearchResultItem item = globalSearchService.search("spring", "DOC", 10).get(0);

        assertEquals("A document about Spring Boot", item.getSnippet());
        assertFalse(item.getSnippet().contains("<"));
    }

    @Test
    void search_nullContent_producesNullSnippet() {
        Essay essay = essay(1L, "Spring Essay", null);

        when(essayRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(essay));

        SearchResultItem item = globalSearchService.search("spring", "ESSAY", 10).get(0);

        assertNull(item.getSnippet());
    }

    // ---------------------------------------------------------------- SQL 口径（单测无法连库，校验注解里的 SQL 文本）

    @Test
    void blogSearchSql_filtersPublishedAndMatchesTitleDescriptionContent() throws Exception {
        String sql = nativeSql(BlogRepository.class, "searchTop");

        assertTrue(sql.contains("t_blog"), sql);
        assertTrue(sql.contains("published = true"), sql);
        assertTrue(sql.contains("title ILIKE :kw"), sql);
        assertTrue(sql.contains("description ILIKE :kw"), sql);
        assertTrue(sql.contains("content ILIKE :kw"), sql);
        assertTrue(sql.contains("THEN 30"), sql);
        assertTrue(sql.contains("THEN 20"), sql);
        assertTrue(sql.contains("THEN 10"), sql);
        assertTrue(sql.contains("COALESCE(b.update_time, b.create_time) DESC"), sql);
        assertTrue(sql.contains("LIMIT :limit"), sql);
    }

    @Test
    void essaySearchSql_filtersPublishedAndMatchesTitleContent() throws Exception {
        String sql = nativeSql(EssayRepository.class, "searchTop");

        assertTrue(sql.contains("t_essay"), sql);
        assertTrue(sql.contains("published = true"), sql);
        assertTrue(sql.contains("title ILIKE :kw"), sql);
        assertTrue(sql.contains("content ILIKE :kw"), sql);
        assertTrue(sql.contains("LIMIT :limit"), sql);
    }

    @Test
    void projectSearchSql_filtersPublishedAndTypeNotZero() throws Exception {
        String sql = nativeSql(ProjectRepository.class, "searchTop");

        assertTrue(sql.contains("t_project"), sql);
        assertTrue(sql.contains("published = true"), sql);
        // Project 必须排除 type = 0 的条目
        assertTrue(sql.contains("type <> 0"), sql);
        assertTrue(sql.contains("title ILIKE :kw"), sql);
        assertTrue(sql.contains("content ILIKE :kw"), sql);
        assertTrue(sql.contains("techs ILIKE :kw"), sql);
        assertTrue(sql.contains("THEN 20"), sql);
        // Project 的时间列是 created_time，不是 create_time
        assertTrue(sql.contains("COALESCE(p.update_time, p.created_time) DESC"), sql);
        assertTrue(sql.contains("LIMIT :limit"), sql);
    }

    @Test
    void docSearchSql_matchesTitleAndDescriptionWithoutContentColumn() throws Exception {
        String sql = nativeSql(DocRepository.class, "searchTop");

        assertTrue(sql.contains("t_doc"), sql);
        assertTrue(sql.contains("published = true"), sql);
        assertTrue(sql.contains("title ILIKE :kw"), sql);
        assertTrue(sql.contains("description ILIKE :kw"), sql);
        // Doc 没有 content 列，SQL 里绝不能出现
        assertFalse(sql.contains("content"), sql);
        assertTrue(sql.contains("LIMIT :limit"), sql);
    }

    // ---------------------------------------------------------------- helpers

    private void stubOnlyBlog(Blog blog) {
        when(blogRepository.searchTop(anyString(), anyInt())).thenReturn(List.of(blog));
    }

    private static String nativeSql(Class<?> repository, String methodName) throws Exception {
        Query query = repository.getMethod(methodName, String.class, int.class).getAnnotation(Query.class);
        assertNotNull(query, "缺少 @Query");
        assertTrue(query.nativeQuery(), "必须使用原生查询");
        return query.value();
    }

    private static SearchResultItem byType(List<SearchResultItem> results, ContentType type) {
        return results.stream()
                .filter(r -> r.getContentType() == type)
                .findFirst()
                .orElseThrow();
    }

    private static Blog blog(Long id, String title, String content, Date updateTime) {
        Blog blog = new Blog();
        blog.setId(id);
        blog.setTitle(title);
        blog.setContent(content);
        blog.setUpdateTime(updateTime);
        return blog;
    }

    private static Essay essay(Long id, String title, String content) {
        Essay essay = new Essay();
        essay.setId(id);
        essay.setTitle(title);
        essay.setContent(content);
        essay.setCreateTime(new Date());
        return essay;
    }

    private static Date date(int year, int month, int day) {
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        calendar.clear();
        calendar.set(year, month - 1, day);
        return calendar.getTime();
    }
}
