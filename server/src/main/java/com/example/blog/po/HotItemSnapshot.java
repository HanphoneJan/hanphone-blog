package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

/**
 * 热点条目每日快照，用于排名变化与分数趋势。
 *
 * <p>唯一键 (itemKey, snapshotDate)：同一条目每天只保留一条快照。</p>
 */
@Data
@Entity
@Table(name = "hot_item_snapshot", uniqueConstraints = {
        @UniqueConstraint(name = "uk_hot_item_snapshot", columnNames = {"item_key", "snapshot_date"})
}, indexes = {
        @Index(name = "idx_hot_item_snapshot_source", columnList = "source_key")
})
public class HotItemSnapshot {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "source_key", length = 64)
    private String sourceKey;

    @Column(name = "item_key", nullable = false, length = 512)
    private String itemKey;

    private Double score;

    @Column(name = "rank_no")
    private Integer rank;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;
}
