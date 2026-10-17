package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * FCM 设备令牌。
 *
 * <p>Android App 上报的 Firebase Cloud Messaging token。博客 server 直接据此向设备
 * 广播「热点已更新」推送，不再经 chat-server。带登录态上报时关联用户（用于后续可能的
 * 定向推送），未登录为匿名。</p>
 */
@Data
@Entity
@Table(name = "device_token", indexes = {
        @Index(name = "idx_device_token_user", columnList = "user_id")
})
public class DeviceToken {

    @Id
    @GeneratedValue
    private Long id;

    /** FCM registration token（唯一） */
    @Column(nullable = false, unique = true, length = 512)
    private String token;

    /** 关联用户 id；匿名上报为 null */
    @Column(name = "user_id")
    private Long userId;

    /** 平台，如 android */
    @Column(length = 16)
    private String platform;

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
