package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 聚合（Insight）运行时配置项（键值对），用于在后台配置 AI 摘要的 url/key/model 等。
 */
@Data
@Entity
@Table(name = "hot_setting")
public class HotSetting {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "setting_key", unique = true, nullable = false, length = 128)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = new Date();
    }
}
