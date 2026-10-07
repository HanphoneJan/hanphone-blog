package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 一次采集运行的日志（全量或手动触发）。
 */
@Data
@Entity
@Table(name = "hot_collect_run", indexes = {
        @Index(name = "idx_hot_collect_run_started", columnList = "started_at")
})
public class HotCollectRun {

    @Id
    @GeneratedValue
    private Long id;

    /** SCHEDULED / MANUAL */
    @Column(name = "trigger_type", length = 16)
    private String triggerType;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "started_at")
    private Date startedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "finished_at")
    private Date finishedAt;

    @Column(name = "total_sources")
    private Integer totalSources = 0;

    @Column(name = "success_count")
    private Integer successCount = 0;

    @Column(name = "failed_count")
    private Integer failedCount = 0;

    /** 每源结果明细 */
    @Column(columnDefinition = "TEXT")
    private String detail;
}
