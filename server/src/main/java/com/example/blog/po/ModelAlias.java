package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

/**
 * 模型别名映射：信源原始命名（小写）→ 归一模型。
 */
@Data
@Entity
@Table(name = "model_alias", indexes = {
        @Index(name = "idx_model_alias_model", columnList = "model_id")
})
public class ModelAlias {

    @Id
    @GeneratedValue
    private Long id;

    @Column(unique = true, nullable = false, length = 512)
    private String alias;

    @Column(name = "model_id", nullable = false)
    private Long modelId;
}
