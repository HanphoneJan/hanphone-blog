package com.example.blog.dao;

import com.example.blog.po.Blog;
import com.example.blog.po.BlogVisitor;
import com.example.blog.po.Comment;
import com.example.blog.po.Doc;
import com.example.blog.po.Essay;
import com.example.blog.po.Project;
import jakarta.persistence.Table;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RepositoryMetadataTest {

    @Test
    void blogListQuery_fetchesAssociationsToAvoidNPlusOne() throws Exception {
        EntityGraph graph = BlogRepository.class
                .getMethod("findAll", Specification.class, Pageable.class)
                .getAnnotation(EntityGraph.class);

        assertNotNull(graph, "findAll(Specification, Pageable) 应声明 @EntityGraph 以避免 N+1");
        assertTrue(List.of(graph.attributePaths()).contains("type"),
                "@EntityGraph 应包含 type 关联");
    }

    @Test
    void hotQueryColumns_areIndexed() {
        assertHasIndexes(Blog.class);
        assertHasIndexes(Comment.class);
        assertHasIndexes(Essay.class);
        assertHasIndexes(Project.class);
        assertHasIndexes(Doc.class);
    }

    private void assertHasIndexes(Class<?> entity) {
        Table table = entity.getAnnotation(Table.class);
        assertNotNull(table, entity.getSimpleName() + " 应声明 @Table");
        assertTrue(table.indexes().length > 0, entity.getSimpleName() + " 应声明索引");
    }

    @Test
    void blogVisitorKeywordSpec_blankReturnsConjunction() {
        Specification<BlogVisitor> spec = BlogVisitorRepository.keywordSpec("   ");
        assertNotNull(spec);
        CriteriaBuilder cb = org.mockito.Mockito.mock(CriteriaBuilder.class);
        org.mockito.Mockito.when(cb.conjunction()).thenReturn(org.mockito.Mockito.mock(jakarta.persistence.criteria.Predicate.class));
        assertNotNull(spec.toPredicate(null, null, cb), "空白关键词应返回始终为真的 conjunction 条件");
    }

    @Test
    void blogVisitorKeywordSpec_nonBlankBuildsOrPredicate() {
        Specification<BlogVisitor> spec = BlogVisitorRepository.keywordSpec("中国");
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> {
            Root<BlogVisitor> root = mockRoot();
            CriteriaBuilder cb = org.mockito.Mockito.mock(CriteriaBuilder.class);
            Expression<String> lower = org.mockito.Mockito.mock(Expression.class);
            org.mockito.Mockito.when(cb.lower(org.mockito.ArgumentMatchers.any())).thenReturn(lower);
            org.mockito.Mockito.when(cb.like(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString())).thenReturn(org.mockito.Mockito.mock(jakarta.persistence.criteria.Predicate.class));
            spec.toPredicate(root, org.mockito.Mockito.mock(CriteriaQuery.class), cb);
        });
    }

    private Root<BlogVisitor> mockRoot() {
        @SuppressWarnings("unchecked")
        Root<BlogVisitor> root = org.mockito.Mockito.mock(Root.class);
        jakarta.persistence.criteria.Path<Object> path = org.mockito.Mockito.mock(jakarta.persistence.criteria.Path.class);
        org.mockito.Mockito.when(root.get("ip")).thenReturn(path);
        org.mockito.Mockito.when(root.get("country")).thenReturn(path);
        org.mockito.Mockito.when(root.get("province")).thenReturn(path);
        org.mockito.Mockito.when(root.get("city")).thenReturn(path);
        return root;
    }
}
