package com.example.blog.service.impl;

import com.example.blog.dao.UserRepository;
import com.example.blog.dao.UserSessionRepository;
import com.example.blog.po.User;
import com.example.blog.po.UserSession;
import com.example.blog.service.AuthSessionService;
import com.example.blog.service.PasswordVersionService;
import com.example.blog.util.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 会话实现。
 *
 * 安全规则（对齐 OAuth 2.0 Security BCP 的 refresh token rotation）：
 * 1. refresh 每次使用都换新，旧值只留在 `prevHash`；
 * 2. 如果有人拿已轮换的旧值来刷新（prevHash 命中），判定泄露 → 吊销整条会话；
 * 3. 改密码 → 全部会话吊销 + 密码版本 +1，旧 access 立即失效。
 */
@Service
public class AuthSessionServiceImpl implements AuthSessionService {

    private static final Logger logger = LoggerFactory.getLogger(AuthSessionServiceImpl.class);

    /** refresh token 有效期（天）：90 天足够「登录一次长期在线」 */
    private static final int REFRESH_DAYS = 90;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final PasswordVersionService passwordVersionService;

    public AuthSessionServiceImpl(UserSessionRepository sessionRepository,
                                  UserRepository userRepository,
                                  PasswordVersionService passwordVersionService) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.passwordVersionService = passwordVersionService;
    }

    @Override
    @Transactional
    public TokenBundle create(User user, String deviceName, String userAgent, String ip) {
        Date now = new Date();
        String sid = UUID.randomUUID().toString();
        String refreshToken = newRefreshToken();

        UserSession session = new UserSession();
        session.setSid(sid);
        session.setUserId(user.getId());
        session.setRefreshHash(sha256(refreshToken));
        session.setDeviceName(cut(deviceName, 120));
        session.setUserAgent(cut(userAgent, 300));
        session.setIp(cut(ip, 64));
        session.setCreatedAt(now);
        session.setLastUsedAt(now);
        session.setExpiresAt(new Date(now.getTime() + REFRESH_DAYS * 24L * 3600 * 1000));
        sessionRepository.save(session);

        TokenUtil.TokenInfo access = TokenUtil.sign(user, sid, pwdVersionOf(user));
        logger.info("新建登录会话 sid={} userId={} device={}", sid, user.getId(), session.getDeviceName());
        return new TokenBundle(access.getToken(), access.getExpireTime(), refreshToken, session.getExpiresAt(), sid);
    }

    @Override
    // 重放检测会在抛 RefreshException 之前吊销会话：必须显式关闭回滚，否则吊销被一起撤销
    @Transactional(noRollbackFor = AuthSessionService.RefreshException.class)
    public TokenBundle refresh(String refreshToken, String userAgent, String ip) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RefreshException("REFRESH_INVALID");
        }
        Date now = new Date();
        String hash = sha256(refreshToken);

        Optional<UserSession> hit = sessionRepository.findFirstByRefreshHash(hash);
        if (hit.isPresent()) {
            UserSession session = hit.get();
            if (session.getRevokedAt() != null) {
                throw new RefreshException("SESSION_REVOKED");
            }
            if (session.getExpiresAt() == null || !session.getExpiresAt().after(now)) {
                throw new RefreshException("REFRESH_INVALID");
            }
            User user = userRepository.findById(session.getUserId()).orElse(null);
            if (user == null) {
                throw new RefreshException("REFRESH_INVALID");
            }

            String newToken = newRefreshToken();
            session.setPrevHash(hash);
            session.setRefreshHash(sha256(newToken));
            session.setLastUsedAt(now);
            if (userAgent != null) {
                session.setUserAgent(cut(userAgent, 300));
            }
            if (ip != null) {
                session.setIp(cut(ip, 64));
            }
            sessionRepository.save(session);

            TokenUtil.TokenInfo access = TokenUtil.sign(user, session.getSid(), pwdVersionOf(user));
            return new TokenBundle(access.getToken(), access.getExpireTime(), newToken, session.getExpiresAt(), session.getSid());
        }

        // 旧令牌被重放：说明 refresh 泄露，整条会话作废
        Optional<UserSession> reused = sessionRepository.findFirstByPrevHash(hash);
        if (reused.isPresent()) {
            UserSession session = reused.get();
            revokeEntity(session, "refresh_reused");
            sessionRepository.save(session);
            logger.warn("检测到 refresh token 重放，已吊销会话 sid={} userId={} ip={}",
                    session.getSid(), session.getUserId(), ip);
            throw new RefreshException("REFRESH_REUSED");
        }

        throw new RefreshException("REFRESH_INVALID");
    }

    @Override
    @Transactional
    public void revoke(String refreshToken, String sid, String reason) {
        UserSession session = null;
        if (refreshToken != null && !refreshToken.isBlank()) {
            session = sessionRepository.findFirstByRefreshHash(sha256(refreshToken)).orElse(null);
        }
        if (session == null && sid != null && !sid.isBlank()) {
            session = sessionRepository.findFirstBySid(sid).orElse(null);
        }
        if (session != null && session.getRevokedAt() == null) {
            revokeEntity(session, reason == null ? "logout" : reason);
            sessionRepository.save(session);
            logger.info("会话已吊销 sid={} userId={} reason={}", session.getSid(), session.getUserId(), reason);
        }
    }

    @Override
    public List<UserSession> listSessions(Long userId) {
        return sessionRepository.findByUserIdOrderByLastUsedAtDescCreatedAtDesc(userId);
    }

    @Override
    @Transactional
    public boolean revokeSession(Long userId, String sid) {
        Optional<UserSession> found = sessionRepository.findFirstBySid(sid);
        if (found.isEmpty() || !userId.equals(found.get().getUserId())) {
            return false;
        }
        UserSession session = found.get();
        if (session.getRevokedAt() == null) {
            revokeEntity(session, "user_revoked");
            sessionRepository.save(session);
        }
        return true;
    }

    @Override
    @Transactional
    public void onPasswordChanged(Long userId, String keepSid) {
        userRepository.incrementPasswordVersion(userId);
        int revoked = keepSid == null || keepSid.isBlank()
                ? sessionRepository.revokeAllByUserId(userId, new Date(), "password_changed")
                : sessionRepository.revokeAllByUserIdExceptSid(userId, keepSid, new Date(), "password_changed");
        // 清掉密码版本缓存，让还在有效期内的旧 access 立刻失效（保留的那台 refresh 一次即可续上）
        passwordVersionService.evict(userId);
        logger.info("密码已修改，吊销会话 userId={} 数量={} 保留sid={}", userId, revoked, keepSid);
    }

    // ------------------------------------------------------------------

    private void revokeEntity(UserSession session, String reason) {
        session.setRevokedAt(new Date());
        session.setRevokedReason(reason);
    }

    private int pwdVersionOf(User user) {
        return user.getPasswordVersion() == null ? 0 : user.getPasswordVersion();
    }

    private static String newRefreshToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 不可用", e);
        }
    }

    private static String cut(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
