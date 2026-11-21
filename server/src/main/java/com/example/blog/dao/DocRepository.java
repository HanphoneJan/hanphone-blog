package com.example.blog.dao;

import com.example.blog.po.Doc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocRepository extends JpaRepository<Doc, Long>, JpaSpecificationExecutor<Doc> {

    Optional<Doc> findByDocId(String docId);

    /** 收藏列表批量回表，避免逐条查询 */
    List<Doc> findByDocIdIn(Collection<String> docIds);

    List<Doc> findByRecommendTrue();

    List<Doc> findByRecommendTrue(Pageable pageable);

    List<Doc> findByRecommendTrueAndPublishedTrue();

    List<Doc> findByRecommendTrueAndPublishedTrue(Pageable pageable);

    List<Doc> findByPublishedTrue();

    Page<Doc> findByPublishedTrue(Pageable pageable);

    Page<Doc> findByOrderByViewCountDesc(Pageable pageable);

    Page<Doc> findByPublishedTrueOrderByViewCountDesc(Pageable pageable);

    long countByPublishedTrue();

    Page<Doc> findByOrderByCreateTimeDesc(Pageable pageable);

    /**
     * 全局搜索：SQL 侧匹配 + 评分 + 排序 + LIMIT。
     * Doc 只有 title/description，没有 content 列，因此只匹配这两列。
     * 评分口径：标题命中 30、描述命中 20；参数 kw 由调用方传入 {@code %keyword%}。
     */
    @Query(value = """
            SELECT d.*
            FROM t_doc d
            WHERE d.published = true
              AND (d.title ILIKE :kw OR d.description ILIKE :kw)
            ORDER BY
              (CASE WHEN d.title ILIKE :kw THEN 30 ELSE 0 END
               + CASE WHEN d.description ILIKE :kw THEN 20 ELSE 0 END) DESC,
              COALESCE(d.update_time, d.create_time) DESC NULLS LAST
            LIMIT :limit
            """, nativeQuery = true)
    List<Doc> searchTop(@Param("kw") String keywordPattern, @Param("limit") int limit);

    @Modifying
    @Query("UPDATE Doc d SET d.viewCount = d.viewCount + 1 WHERE d.docId = :docId")
    int incrementViewCount(@Param("docId") String docId);

    @Modifying
    @Query("UPDATE Doc d SET d.recommend = :recommend WHERE d.id = :id")
    int updateRecommend(@Param("id") Long id, @Param("recommend") boolean recommend);

    @Modifying
    @Query("UPDATE Doc d SET d.published = :published WHERE d.id = :id")
    int updatePublished(@Param("id") Long id, @Param("published") boolean published);
}
