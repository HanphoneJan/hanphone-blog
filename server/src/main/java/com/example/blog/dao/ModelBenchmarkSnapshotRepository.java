package com.example.blog.dao;

import com.example.blog.po.ModelBenchmarkSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ModelBenchmarkSnapshotRepository extends JpaRepository<ModelBenchmarkSnapshot, Long> {

    Optional<ModelBenchmarkSnapshot> findByModelIdAndBenchmarkKeyAndSnapshotDate(
            Long modelId, String benchmarkKey, LocalDate snapshotDate);

    List<ModelBenchmarkSnapshot> findByModelIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(
            Long modelId, LocalDate since);

    List<ModelBenchmarkSnapshot> findByModelIdInAndBenchmarkKeyAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(
            List<Long> modelIds, String benchmarkKey, LocalDate since);

    List<ModelBenchmarkSnapshot> findByModelId(Long modelId);
}
