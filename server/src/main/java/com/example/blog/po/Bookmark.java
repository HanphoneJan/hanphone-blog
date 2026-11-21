package com.example.blog.po;

import com.example.blog.enums.BookmarkType;
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
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

import java.util.Date;

/**
 * 收藏。
 *
 * <p>统一一张表：{@code content_type} + {@code content_key} 定位内容。
 * 博客 / 随笔的 key 是数值 ID 的字符串形式，文档的 key 是 {@code docId}。
 * 唯一约束保证同一用户对同一内容只会有一条记录。</p>
 */
@Data
@Entity
@Table(name = "t_bookmark",
        uniqueConstraints = @UniqueConstraint(name = "uk_bookmark_user_type_key",
                columnNames = {"user_id", "content_type", "content_key"}),
        indexes = @Index(name = "idx_bookmark_user_time", columnList = "user_id,create_time"))
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 16)
    private BookmarkType contentType;

    @Column(name = "content_key", nullable = false, length = 64)
    private String contentKey;

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
