package com.example.blog.dao;

import com.example.blog.po.HotItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Optional;

public interface HotItemRepository extends JpaRepository<HotItem, Long> {

    Optional<HotItem> findBySourceKeyAndItemKey(String sourceKey, String itemKey);

    List<HotItem> findByCategory(String category, Pageable pageable);

    long countByCategory(String category);

    /**
     * 清理某信源本轮采集未再出现的条目。{@code hot_item} 只保存「当前值」，
     * 历史分数/排名由 {@code hot_item_snapshot} 保留，因此不再热门的条目应删除，
     * 否则热点流会一直混入历史条目、且无法按 rank 正确排序。
     *
     * <p>仅在信源本轮采集成功后调用，采集失败的信源不动，避免误删。</p>
     */
    @Modifying
    @Transactional
    @Query("delete from HotItem i where i.sourceKey = :sourceKey and i.lastSeenAt < :cutoff")
    int deleteStaleBySourceKey(@Param("sourceKey") String sourceKey, @Param("cutoff") Date cutoff);
}
