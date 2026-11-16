package com.example.blog.po;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

/**
 * 登录会话（长期登录）。
 *
 * 一枚 refresh token 对应一条记录：服务端只保存它的 SHA-256，明文只发给客户端一次。
 * - `sid` 同时写进 access token 的 claim，用来定位会话；
 * - 每次刷新轮换 refresh（旧值写入 `prevHash`），命中 `prevHash` 说明有人重放了已作废的令牌，
 *   判定为泄露，吊销整条会话；
 * - 改密码时按 `userId` 批量吊销。
 */
@Entity
@Table(name = "t_user_session", indexes = {
        @Index(name = "idx_session_user", columnList = "user_id"),
        @Index(name = "idx_session_hash", columnList = "refresh_hash")
})
@Getter
@Setter
public class UserSession {

    @Id
    @GeneratedValue
    private Long id;

    /** 会话 id（UUID），写进 JWT 的 sid claim */
    @Column(nullable = false, unique = true, length = 36)
    private String sid;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** sha256(refresh token) 的十六进制 */
    @Column(name = "refresh_hash", nullable = false, length = 64)
    private String refreshHash;

    /** 上一次的 refresh 哈希：用于识别「旧令牌被重放」 */
    @Column(name = "prev_hash", length = 64)
    private String prevHash;

    @Column(name = "device_name", length = 120)
    private String deviceName;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    @Column(length = 64)
    private String ip;

    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Column(name = "last_used_at")
    private Date lastUsedAt;

    @Column(name = "expires_at", nullable = false)
    private Date expiresAt;

    @Column(name = "revoked_at")
    private Date revokedAt;

    @Column(name = "revoked_reason", length = 40)
    private String revokedReason;

    public boolean isActive(Date now) {
        return revokedAt == null && expiresAt != null && expiresAt.after(now);
    }
}
