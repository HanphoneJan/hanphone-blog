package com.example.blog.dao;

import com.example.blog.po.BenchmarkMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BenchmarkMetaRepository extends JpaRepository<BenchmarkMeta, Long> {

    Optional<BenchmarkMeta> findByBenchmarkKey(String benchmarkKey);

    List<BenchmarkMeta> findByCategoryOrderByBenchmarkKeyAsc(String category);
}
