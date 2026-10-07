package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 通用热点条目（当前值）。
 *
 * <p>由采集器归一后写入，唯一键为 (sourceKey, itemKey)。历史分数/排名变化
 * 由 {@link HotItemSnapshot} 按日保存，用于趋势展示。</p>
 */
@Data
@Entity
@Table(name = "hot_item", uniqueConstraints = {
        @UniqueConstraint(name = "uk_hot_item_source_key", columnNames = {"source_key", "item_key"})
}, indexes = {
        @Index(name = "idx_hot_item_category_score", columnList = "category, score"),
        @Index(name = "idx_hot_item_source", columnList = "source_key")
})
public class HotItem {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "source_key", nullable = false, length = 64)
    private String sourceKey;

    @Column(length = 32)
    private String category;

    /** 源内稳定 key，如 github:owner/repo、hf:model:Qwen/Qwen3 */
    @Column(name = "item_key", nullable = false, length = 512)
    private String itemKey;

    @Column(length = 512)
    private String title;

    /** 中文标题（AI 摘要，可空） */
    @Column(name = "title_zh", length = 512)
    private String titleZh;

    /** 中文摘要（AI 摘要，可空） */
    @Column(name = "summary_zh", columnDefinition = "TEXT")
    private String summaryZh;

    @Column(columnDefinition = "TEXT")
    private String url;

    @Column(length = 256)
    private String author;

    /** 逗号分隔标签 */
    @Column(length = 512)
    private String tags;

    /** 热度 / 星数 / 分数，统一用 double 承载 */
    private Double score;

    @Column(name = "rank_no")
    private Integer rank;

    /** 原始补充信息（JSON 字符串） */
    @Column(columnDefinition = "TEXT")
    private String extra;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "published_at")
    private Date publishedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "first_seen_at")
    private Date firstSeenAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "last_seen_at")
    private Date lastSeenAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "collected_at")
    private Date collectedAt;
}
