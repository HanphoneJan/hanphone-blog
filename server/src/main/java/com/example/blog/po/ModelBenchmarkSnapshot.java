package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

/**
 * 模型榜单分数每日快照，用于趋势曲线与排名变化。
 * 唯一键 (modelId, benchmarkKey, snapshotDate)：同模型同榜每天一条。
 */
@Data
@Entity
@Table(name = "model_benchmark_snapshot", uniqueConstraints = {
        @UniqueConstraint(name = "uk_model_bench_snap", columnNames = {"model_id", "benchmark_key", "snapshot_date"})
}, indexes = {
        @Index(name = "idx_model_bench_snap_key", columnList = "benchmark_key, snapshot_date")
})
public class ModelBenchmarkSnapshot {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "model_id", nullable = false)
    private Long modelId;

    @Column(name = "benchmark_key", nullable = false, length = 64)
    private String benchmarkKey;

    @Column(name = "source_key", length = 64)
    private String sourceKey;

    private Double score;

    @Column(name = "rank_no")
    private Integer rank;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;
}
