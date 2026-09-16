package com.example.blog.dao;

import com.example.blog.po.Blog;
import com.example.blog.po.Comment;
import com.example.blog.po.Doc;
import com.example.blog.po.Essay;
import com.example.blog.po.Project;
import jakarta.persistence.Table;
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
}
