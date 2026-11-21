package com.example.blog.po;

import com.example.blog.enums.ContentType;
import com.example.blog.enums.NotificationType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.Data;

import java.util.Date;

/**
 * 站内通知。
 *
 * <p>一条记录表示「某人（actor）对某条内容（target）评论/回复了我（userId）」。
 * 索引 {@code (user_id,is_read,create_time)} 同时服务未读数统计和倒序分页。</p>
 */
@Data
@Entity
@Table(name = "t_notification", indexes = {
        @Index(name = "idx_notification_user_read_time", columnList = "user_id,is_read,create_time")
})
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 收件人 */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private NotificationType type;

    /** 触发者（评论作者）；匿名评论时为空 */
    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_name", length = 64)
    private String actorName;

    @Column(name = "actor_avatar", length = 512)
    private String actorAvatar;

    /** 目标内容类型（BLOG / ESSAY） */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 16)
    private ContentType targetType;

    /** 目标内容 ID（博客 ID / 随笔 ID） */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** 被回复的评论 ID（顶级评论为空） */
    @Column(name = "parent_id")
    private Long parentId;

    /** 评论纯文本摘要（最多 80 字，已去除 HTML） */
    @Column(length = 300)
    private String excerpt;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "create_time", nullable = false)
    private Date createTime;

    @PrePersist
    protected void onCreate() {
        if (createTime == null) {
            createTime = new Date();
        }
    }
}
