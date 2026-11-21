package com.example.blog.dao;

import com.example.blog.po.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {
    @Modifying
    @Query("UPDATE Project e SET e.recommend = :recommend WHERE e.id = :id")
    int updateRecommend(@Param("id") Long id, @Param("recommend") boolean recommend);

    /**
     * 全局搜索：SQL 侧匹配 + 评分 + 排序 + LIMIT。
     * 评分口径：标题命中 30、技术栈命中 20、正文命中 10；Project 的时间列是 created_time。
     * 参数 kw 由调用方传入 {@code %keyword%}。
     */
    @Query(value = """
            SELECT p.*
            FROM t_project p
            WHERE p.published = true
              AND p.type <> 0
              AND (p.title ILIKE :kw OR p.content ILIKE :kw OR p.techs ILIKE :kw)
            ORDER BY
              (CASE WHEN p.title ILIKE :kw THEN 30 ELSE 0 END
               + CASE WHEN p.techs ILIKE :kw THEN 20 ELSE 0 END
               + CASE WHEN p.content ILIKE :kw THEN 10 ELSE 0 END) DESC,
              COALESCE(p.update_time, p.created_time) DESC NULLS LAST
            LIMIT :limit
            """, nativeQuery = true)
    List<Project> searchTop(@Param("kw") String keywordPattern, @Param("limit") int limit);

    @Query("select p from Project p where p.recommend = true")
    List<Project> findTop(Pageable pageable);

    @Modifying
    @Query("UPDATE Project p SET p.published = :published WHERE p.id = :id")
    int updatePublished(@Param("id") Long id, @Param("published") boolean published);

    List<Project> findByPublishedTrue();

    Page<Project> findByPublishedTrue(Pageable pageable);

    long countByPublishedTrue();
}
