package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 模型价格 / 上下文窗口（每 model + source 一条，覆盖式更新）。
 */
@Data
@Entity
@Table(name = "model_pricing", uniqueConstraints = {
        @UniqueConstraint(name = "uk_model_pricing", columnNames = {"model_id", "source_key"})
})
public class ModelPricing {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "model_id", nullable = false)
    private Long modelId;

    @Column(name = "source_key", nullable = false, length = 64)
    private String sourceKey;

    /** 每百万输入 token 价格（USD） */
    @Column(name = "input_price")
    private Double inputPrice;

    /** 每百万输出 token 价格（USD） */
    @Column(name = "output_price")
    private Double outputPrice;

    @Column(name = "context_window")
    private Integer contextWindow;

    @Column(length = 8)
    private String currency = "USD";

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;
}
