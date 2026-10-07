package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 归一后的模型实体（跨信源去重）。
 *
 * <p>canonical_key 由 vendor + 规范化名称生成；同一模型的各信源原始命名
 * 记录在 {@link ModelAlias} 中。</p>
 */
@Data
@Entity
@Table(name = "model_entity", indexes = {
        @Index(name = "idx_model_entity_vendor", columnList = "vendor"),
        @Index(name = "idx_model_entity_modality", columnList = "modality")
})
public class ModelEntity {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "canonical_key", unique = true, nullable = false, length = 256)
    private String canonicalKey;

    @Column(name = "display_name", length = 512)
    private String displayName;

    @Column(length = 128)
    private String vendor;

    /** text / coding / agent / embedding / image / video / speech */
    @Column(length = 32)
    private String modality;

    @Column(name = "open_weights")
    private Boolean openWeights;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "release_date")
    private Date releaseDate;

    @Column(columnDefinition = "TEXT")
    private String links;

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
