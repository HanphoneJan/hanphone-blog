package com.example.blog.dao;

import com.example.blog.po.ModelBenchmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModelBenchmarkRepository extends JpaRepository<ModelBenchmark, Long> {

    Optional<ModelBenchmark> findByModelIdAndBenchmarkKeyAndSourceKey(
            Long modelId, String benchmarkKey, String sourceKey);

    List<ModelBenchmark> findByBenchmarkKeyIn(List<String> benchmarkKeys);

    List<ModelBenchmark> findByModelId(Long modelId);

    List<ModelBenchmark> findByModelIdIn(List<Long> modelIds);
}
