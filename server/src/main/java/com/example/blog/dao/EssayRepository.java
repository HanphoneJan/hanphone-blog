package com.example.blog.dao;

import com.example.blog.po.Essay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface EssayRepository extends JpaRepository<Essay,Long>, JpaSpecificationExecutor<Essay> {
    @Query("SELECT e FROM Essay e LEFT JOIN FETCH e.essayFileUrls")
    List<Essay> findAllWithFileUrls();

    @Modifying
    @Query("UPDATE Essay e SET e.likes = e.likes + :delta WHERE e.id = :id")
    int updateLikes(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("UPDATE Essay e SET e.recommend = :recommend WHERE e.id = :id")
    int updateRecommend(@Param("id") Long id, @Param("recommend") boolean recommend);

    /**
     * 全局搜索：SQL 侧匹配 + 评分 + 排序 + LIMIT。
     * 评分口径：标题命中 30、正文命中 10；参数 kw 由调用方传入 {@code %keyword%}。
     */
    @Query(value = """
            SELECT e.*
            FROM t_essay e
            WHERE e.published = true
              AND (e.title ILIKE :kw OR e.content ILIKE :kw)
            ORDER BY
              (CASE WHEN e.title ILIKE :kw THEN 30 ELSE 0 END
               + CASE WHEN e.content ILIKE :kw THEN 10 ELSE 0 END) DESC,
              e.create_time DESC NULLS LAST
            LIMIT :limit
            """, nativeQuery = true)
    List<Essay> searchTop(@Param("kw") String keywordPattern, @Param("limit") int limit);

    @Query("select e from Essay e where e.recommend = true")
    List<Essay> findTop(Pageable pageable);

    @Modifying
    @Query("UPDATE Essay e SET e.published = :published WHERE e.id = :id")
    int updatePublished(@Param("id") Long id, @Param("published") boolean published);

    List<Essay> findByPublishedTrue();

    List<Essay> findByPublishedTrue(Pageable pageable);

    long countByPublishedTrue();

}
