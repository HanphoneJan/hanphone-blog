package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.po.UserSession;
import com.example.blog.service.AuthSessionService;
import com.example.blog.util.ClientIpUtil;
import com.example.blog.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 长期登录：refresh / logout / 会话管理。
 *
 * 这些接口在 `/auth` 下，不在 `/admin/**` 拦截范围内，所以需要自己解析 Token
 * （`Authorization: Bearer xxx` 或 `Token: xxx`，与聊天 REST 保持一致的两种写法都认）。
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthSessionService authSessionService;

    public AuthController(AuthSessionService authSessionService) {
        this.authSessionService = authSessionService;
    }

    /**
     * 用 refresh 换新 access + 新 refresh（轮换）。
     * 失败返回 401 + code：REFRESH_INVALID / REFRESH_REUSED / SESSION_REVOKED。
     */
    @PostMapping("/refresh")
    public Result<Map<String, Object>> refresh(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String refreshToken = body == null ? null : body.get("refreshToken");
        try {
            AuthSessionService.TokenBundle bundle = authSessionService.refresh(
                    refreshToken,
                    request.getHeader("User-Agent"),
                    ClientIpUtil.getClientIp(request)
            );
            return new Result<>(true, StatusCode.OK, "刷新成功", toMap(bundle));
        } catch (AuthSessionService.RefreshException e) {
            logger.warn("refresh 失败 code={} ip={}", e.getCode(), ClientIpUtil.getClientIp(request));
            Map<String, Object> data = new HashMap<>();
            data.put("code", e.getCode());
            return new Result<>(false, StatusCode.ERROR, messageOf(e.getCode()), data);
        } catch (Exception e) {
            logger.error("refresh 异常", e);
            return new Result<>(false, StatusCode.ERROR, "刷新失败，请重新登录", null);
        }
    }

    /**
     * 用一枚仍然有效的 access token 换取会话（OAuth 登录后补建 refresh，避免把 refresh 放进 URL）。
     */
    @PostMapping("/adopt")
    public Result<Map<String, Object>> adopt(@RequestBody(required = false) Map<String, String> body,
                                             HttpServletRequest request) {
        String token = extractToken(request);
        Long userId = requireUserId(token);
        if (userId == null) {
            return new Result<>(false, StatusCode.ERROR, "登录状态无效", null);
        }
        User user = new User();
        user.setId(userId);
        user.setType(TokenUtil.getUserType(token));
        user.setPasswordVersion(TokenUtil.getPasswordVersion(token));
        String deviceName = headerOr(body, request, "deviceName");
        AuthSessionService.TokenBundle bundle = authSessionService.create(
                user, deviceName, request.getHeader("User-Agent"), ClientIpUtil.getClientIp(request)
        );
        return new Result<>(true, StatusCode.OK, "会话已建立", toMap(bundle));
    }

    /** 退出登录：吊销当前会话（refresh 或 sid 任一即可） */
    @PostMapping("/logout")
    public Result<Void> logout(@RequestBody(required = false) Map<String, String> body, HttpServletRequest request) {
        String refreshToken = body == null ? null : body.get("refreshToken");
        String sid = TokenUtil.getSid(extractToken(request));
        authSessionService.revoke(refreshToken, sid, "logout");
        return new Result<>(true, StatusCode.OK, "已退出登录", null);
    }

    /** 登录设备列表 */
    @GetMapping("/sessions")
    public Result<List<Map<String, Object>>> sessions(HttpServletRequest request) {
        String token = extractToken(request);
        Long userId = requireUserId(token);
        if (userId == null) {
            return new Result<>(false, StatusCode.ERROR, "登录状态无效", null);
        }
        String currentSid = TokenUtil.getSid(token);
        Date now = new Date();
        List<Map<String, Object>> list = new ArrayList<>();
        for (UserSession s : authSessionService.listSessions(userId)) {
            Map<String, Object> item = new HashMap<>();
            item.put("sid", s.getSid());
            item.put("deviceName", s.getDeviceName());
            item.put("userAgent", s.getUserAgent());
            item.put("ip", s.getIp());
            item.put("createdAt", s.getCreatedAt());
            item.put("lastUsedAt", s.getLastUsedAt());
            item.put("expiresAt", s.getExpiresAt());
            item.put("revoked", s.getRevokedAt() != null);
            item.put("revokedReason", s.getRevokedReason());
            item.put("active", s.getRevokedAt() == null && s.getExpiresAt() != null && s.getExpiresAt().after(now));
            item.put("current", currentSid != null && currentSid.equals(s.getSid()));
            list.add(item);
        }
        return new Result<>(true, StatusCode.OK, "获取登录设备成功", list);
    }

    /** 下线指定会话（只能操作自己的） */
    @DeleteMapping("/sessions/{sid}")
    public Result<Void> revokeSession(@PathVariable String sid, HttpServletRequest request) {
        Long userId = requireUserId(extractToken(request));
        if (userId == null) {
            return new Result<>(false, StatusCode.ERROR, "登录状态无效", null);
        }
        boolean ok = authSessionService.revokeSession(userId, sid);
        return new Result<>(ok, ok ? StatusCode.OK : StatusCode.ERROR, ok ? "已下线该设备" : "会话不存在", null);
    }

    // ------------------------------------------------------------------

    private Map<String, Object> toMap(AuthSessionService.TokenBundle bundle) {
        Map<String, Object> data = new HashMap<>();
        data.put("token", bundle.getAccessToken());
        data.put("expire", bundle.getAccessExpire());
        data.put("refreshToken", bundle.getRefreshToken());
        data.put("refreshExpire", bundle.getRefreshExpire());
        data.put("sid", bundle.getSid());
        return data;
    }

    private String messageOf(String code) {
        return switch (code) {
            case "REFRESH_REUSED" -> "检测到登录凭证被重复使用，已强制下线，请重新登录";
            case "SESSION_REVOKED" -> "登录状态已失效，请重新登录";
            default -> "登录状态已过期，请重新登录";
        };
    }

    private Long requireUserId(String token) {
        if (token == null || !TokenUtil.verify(token)) {
            return null;
        }
        return TokenUtil.getUserId(token);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        String token = request.getHeader("Token");
        return token == null ? null : token.trim().replaceAll("^\"|\"$", "");
    }

    private String headerOr(Map<String, String> body, HttpServletRequest request, String key) {
        String fromHeader = request.getHeader("X-Device-Name");
        if (fromHeader != null && !fromHeader.isBlank()) {
            return fromHeader;
        }
        if (body != null && body.get(key) != null && !body.get(key).isBlank()) {
            return body.get(key);
        }
        String ua = request.getHeader("User-Agent");
        if (ua == null) {
            return null;
        }
        // 简单归类，够设备列表展示用
        if (ua.contains("Android")) return "Android";
        if (ua.contains("Windows")) return "Windows";
        if (ua.contains("Macintosh")) return "macOS";
        if (ua.contains("iPhone") || ua.contains("iPad")) return "iOS";
        return ua.length() > 60 ? ua.substring(0, 60) : ua;
    }
}
