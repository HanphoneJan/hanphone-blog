package com.example.blog.web;

import com.example.blog.dao.DeviceTokenRepository;
import com.example.blog.po.DeviceToken;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.util.TokenUtil;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * FCM 设备令牌上报接口（供 Android App 调用，博客 server 直接据此向设备推送热点更新）。
 *
 * <p>不走 {@code /admin/**}，因此不受 TokenInterceptor 保护；带登录态时关联用户，匿名也可上报。
 * 与 chat-server 的 {@code /chat-api/api/devices} 契约一致（body {@code {token, platform}}），
 * App 同时上报两边：博客用于热点推送，chat 用于私信推送。</p>
 */
@RestController
public class DeviceController {

    private final DeviceTokenRepository deviceTokenRepository;

    public DeviceController(DeviceTokenRepository deviceTokenRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
    }

    /** 上报/更新设备 token */
    @PostMapping("/devices")
    public Result<Map<String, Object>> register(@RequestBody(required = false) Map<String, String> body,
                                                @RequestHeader(value = "token", required = false) String tokenHeader,
                                                @RequestHeader(value = "Authorization", required = false) String authorization) {
        String deviceToken = body == null ? null : body.get("token");
        if (deviceToken == null || deviceToken.isBlank()) {
            return new Result<>(false, StatusCode.ERROR, "缺少设备 token", null);
        }
        String platform = body.getOrDefault("platform", "android");
        Long userId = resolveUserId(tokenHeader, authorization);

        String normalized = deviceToken.trim();
        DeviceToken entity = deviceTokenRepository.findByToken(normalized).orElseGet(DeviceToken::new);
        entity.setToken(normalized);
        entity.setPlatform(platform);
        // 与 chat-server 语义一致：每次上报覆盖 user_id（登出后匿名上报即解除关联）
        entity.setUserId(userId);
        deviceTokenRepository.save(entity);

        return new Result<>(true, StatusCode.OK, "上报成功", Map.of("success", true));
    }

    /** 移除设备 token（关闭推送 / 清除数据时） */
    @PostMapping("/devices/remove")
    public Result<Map<String, Object>> remove(@RequestBody(required = false) Map<String, String> body) {
        String deviceToken = body == null ? null : body.get("token");
        if (deviceToken == null || deviceToken.isBlank()) {
            return new Result<>(false, StatusCode.ERROR, "缺少设备 token", null);
        }
        deviceTokenRepository.findByToken(deviceToken.trim()).ifPresent(deviceTokenRepository::delete);
        return new Result<>(true, StatusCode.OK, "已移除", Map.of("success", true));
    }

    /** 解析登录用户 id：优先博客标准的 {@code token} 头，其次 {@code Authorization: Bearer}；无效/匿名返回 null */
    private Long resolveUserId(String tokenHeader, String authorization) {
        String token = null;
        if (tokenHeader != null && !tokenHeader.isBlank()) {
            token = stripQuotes(tokenHeader.trim());
        } else if (authorization != null && authorization.startsWith("Bearer ")) {
            token = authorization.substring("Bearer ".length()).trim();
        }
        if (token == null || token.isBlank()) {
            return null;
        }
        return TokenUtil.getUserId(token);
    }

    private String stripQuotes(String value) {
        if (value.length() > 1 && value.startsWith("\"") && value.endsWith("\"")) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }
}
