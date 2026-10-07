package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.Date;

/**
 * 模型某榜单的当前分数（每 model + benchmark + source 一条，覆盖式更新）。
 * 历史趋势后续由快照表承载。
 */
@Data
@Entity
@Table(name = "model_benchmark", uniqueConstraints = {
        @UniqueConstraint(name = "uk_model_benchmark", columnNames = {"model_id", "benchmark_key", "source_key"})
}, indexes = {
        @Index(name = "idx_model_benchmark_key", columnList = "benchmark_key")
})
public class ModelBenchmark {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "model_id", nullable = false)
    private Long modelId;

    @Column(name = "benchmark_key", nullable = false, length = 64)
    private String benchmarkKey;

    private Double score;

    @Column(name = "rank_no")
    private Integer rank;

    @Column(name = "source_key", nullable = false, length = 64)
    private String sourceKey;

    @Column(name = "snapshot_date")
    private LocalDate snapshotDate;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;
}
