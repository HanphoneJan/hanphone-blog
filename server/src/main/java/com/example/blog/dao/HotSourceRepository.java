package com.example.blog.dao;

import com.example.blog.po.HotSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HotSourceRepository extends JpaRepository<HotSource, Long> {

    Optional<HotSource> findBySourceKey(String sourceKey);

    List<HotSource> findAllByOrderByCategoryAscSourceKeyAsc();
}
