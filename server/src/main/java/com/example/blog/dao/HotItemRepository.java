package com.example.blog.dao;

import com.example.blog.po.HotItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HotItemRepository extends JpaRepository<HotItem, Long> {

    Optional<HotItem> findBySourceKeyAndItemKey(String sourceKey, String itemKey);

    List<HotItem> findByCategory(String category, Pageable pageable);

    long countByCategory(String category);
}
