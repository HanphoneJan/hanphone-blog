package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 洞察（Insight）信源元数据与健康状态。
 *
 * <p>每个采集器对应一条记录，用于展示「最后成功时间 / 最后错误 / 条目数」，
 * 采集失败时降级展示上次成功数据，不阻塞页面。</p>
 */
@Data
@Entity
@Table(name = "hot_source", indexes = {
        @Index(name = "idx_hot_source_category", columnList = "category")
})
public class HotSource {

    @Id
    @GeneratedValue
    private Long id;

    /** 信源唯一 key，如 github-trending / huggingface */
    @Column(name = "source_key", unique = true, nullable = false, length = 64)
    private String sourceKey;

    /** 分类，如 github / hf / community */
    @Column(length = 32)
    private String category;

    @Column(name = "display_name", length = 128)
    private String displayName;

    @Column(name = "source_url", length = 512)
    private String sourceUrl;

    private boolean enabled = true;

    /** 最近一次成功采集到的条目数 */
    @Column(name = "item_count")
    private Integer itemCount = 0;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "last_run_at")
    private Date lastRunAt;

    /** SUCCESS / FAILED / RUNNING */
    @Column(name = "last_status", length = 16)
    private String lastStatus;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "last_success_at")
    private Date lastSuccessAt;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at")
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;

    @PrePersist
    public void prePersist() {
        Date now = new Date();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = new Date();
    }
}
