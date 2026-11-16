package com.example.blog.service;

import com.example.blog.po.User;
import com.example.blog.po.UserSession;

import java.util.Date;
import java.util.List;

/**
 * 长期登录：会话（refresh token）的签发 / 轮换 / 吊销。
 *
 * 三端（Web / Android / Tauri）共用同一套接口：登录拿 access + refresh，
 * access 短命（默认 30 分钟），refresh 90 天且每次使用都会轮换。
 */
public interface AuthSessionService {

    /** 一次登录/刷新产出的令牌对 */
    class TokenBundle {
        private final String accessToken;
        private final Date accessExpire;
        private final String refreshToken;
        private final Date refreshExpire;
        private final String sid;

        public TokenBundle(String accessToken, Date accessExpire, String refreshToken, Date refreshExpire, String sid) {
            this.accessToken = accessToken;
            this.accessExpire = accessExpire;
            this.refreshToken = refreshToken;
            this.refreshExpire = refreshExpire;
            this.sid = sid;
        }

        public String getAccessToken() { return accessToken; }
        public Date getAccessExpire() { return accessExpire; }
        public String getRefreshToken() { return refreshToken; }
        public Date getRefreshExpire() { return refreshExpire; }
        public String getSid() { return sid; }
    }

    /** 刷新失败：code 用于客户端区分「需要重新登录」与「疑似泄露」 */
    class RefreshException extends RuntimeException {
        private final String code;

        public RefreshException(String code) {
            super(code);
            this.code = code;
        }

        public String getCode() { return code; }
    }

    /** 新建会话（登录 / 注册 / OAuth 登录 / 由 access 换取会话） */
    TokenBundle create(User user, String deviceName, String userAgent, String ip);

    /** 轮换：校验 → 作废旧 refresh → 发新 access + 新 refresh */
    TokenBundle refresh(String refreshToken, String userAgent, String ip);

    /** 吊销当前会话（按 refresh 或 sid 定位，二者传其一） */
    void revoke(String refreshToken, String sid, String reason);

    /** 当前用户所有会话（含已吊销/过期，前端自行过滤展示） */
    List<UserSession> listSessions(Long userId);

    /** 下线指定会话；只能操作自己的 */
    boolean revokeSession(Long userId, String sid);

    /**
     * 改密码后调用：密码版本 +1 + 吊销该用户全部会话。
     *
     * @param keepSid 保留的会话（用户自己改密码时保留当前设备）；null 表示全部吊销
     */
    void onPasswordChanged(Long userId, String keepSid);
}
