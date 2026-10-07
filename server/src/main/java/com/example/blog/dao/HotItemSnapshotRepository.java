package com.example.blog.dao;

import com.example.blog.po.HotItemSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HotItemSnapshotRepository extends JpaRepository<HotItemSnapshot, Long> {

    Optional<HotItemSnapshot> findByItemKeyAndSnapshotDate(String itemKey, LocalDate snapshotDate);

    List<HotItemSnapshot> findByItemKeyOrderBySnapshotDateAsc(String itemKey);
}
