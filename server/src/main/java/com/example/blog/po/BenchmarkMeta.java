package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 榜单元数据（口径、单位、所属模态）。
 */
@Data
@Entity
@Table(name = "benchmark_meta", indexes = {
        @Index(name = "idx_benchmark_meta_category", columnList = "category")
})
public class BenchmarkMeta {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "benchmark_key", unique = true, nullable = false, length = 64)
    private String benchmarkKey;

    @Column(length = 128)
    private String name;

    /** 所属模态：text / coding / agent / embedding / image / video / speech */
    @Column(length = 32)
    private String category;

    /** 单位：index / elo / % / score / ips */
    @Column(length = 32)
    private String unit;

    @Column(name = "higher_is_better")
    private boolean higherIsBetter = true;

    @Column(name = "source_key", length = 64)
    private String sourceKey;

    @Column(length = 512)
    private String description;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;
}
