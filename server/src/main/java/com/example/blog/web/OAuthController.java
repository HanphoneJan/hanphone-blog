package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.service.OAuthProvider;
import com.example.blog.service.UserService;
import com.example.blog.util.TokenUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/oauth")
public class OAuthController {

    private final Map<String, OAuthProvider> providers;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    private static final Logger logger = LoggerFactory.getLogger(OAuthController.class);

    @Value("${FRONTEND_URL:https://hanphone.cn}")
    private String frontendUrl;

    public OAuthController(Map<String, OAuthProvider> providers,
                           UserService userService,
                           ObjectMapper objectMapper) {
        this.providers = providers;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    /**
     * 发起 OAuth 授权（通配路由）
     */
    @GetMapping("/{provider}/authorize")
    public void authorize(@PathVariable String provider,
                          jakarta.servlet.http.HttpServletResponse response) throws IOException {
        OAuthProvider p = providers.get(provider);
        if (p == null) {
            response.sendError(400, "Unknown OAuth provider: " + provider);
            return;
        }
        response.sendRedirect(p.buildAuthorizationUrl());
    }

    /**
     * OAuth 回调（通配路由）
     */
    @GetMapping("/{provider}/callback")
    public void callback(@PathVariable String provider,
                         @RequestParam(value = "code", required = false) String code,
                         @RequestParam(value = "error", required = false) String error,
                         jakarta.servlet.http.HttpServletResponse response) throws IOException {

        if (error != null || code == null) {
            response.sendRedirect(frontendUrl + "/oauth/callback?error=access_denied");
            return;
        }

        OAuthProvider p = providers.get(provider);
        if (p == null) {
            response.sendRedirect(frontendUrl + "/oauth/callback?error=invalid_provider");
            return;
        }

        try {
            User user = p.handleCallback(code);
            String token = TokenUtil.sign(user).getToken();

            Long userId = TokenUtil.getUserId(token);
            if (userId == null) {
                logger.error("Failed to extract userId from OAuth token");
                response.sendRedirect(frontendUrl + "/oauth/callback?error=server_error");
                return;
            }

            userService.clearSensitiveFields(user);
            String userInfoJson = objectMapper.writeValueAsString(user);
            String userInfoEncoded = java.net.URLEncoder.encode(userInfoJson, StandardCharsets.UTF_8);

            String providerId = p.getProviderId(user);
            String providerIdParam = providerId != null ? "&providerId=" + providerId : "";

            response.sendRedirect(frontendUrl
                    + "/oauth/callback?token=" + token
                    + "&userInfo=" + userInfoEncoded
                    + "&provider=" + provider
                    + providerIdParam);
        } catch (Exception e) {
            logger.error("OAuth callback failed for provider: {}", provider, e);
            response.sendRedirect(frontendUrl + "/oauth/callback?error=server_error");
        }
    }

    /**
     * 浏览器端 ID Token 验证（无需服务端调第三方 API）
     */
    @PostMapping("/{provider}/verify")
    public Result<Map<String, Object>> verify(@PathVariable String provider,
                                               @RequestBody Map<String, String> body) {
        OAuthProvider p = providers.get(provider);
        if (p == null) {
            return new Result<>(false, StatusCode.ERROR, "Unknown OAuth provider: " + provider, null);
        }

        String credential = body.get("credential");
        if (credential == null || credential.isEmpty()) {
            return new Result<>(false, StatusCode.ERROR, "credential不能为空", null);
        }

        try {
            User user = p.handleIdToken(credential);
            TokenUtil.TokenInfo tokenInfo = TokenUtil.sign(user);
            userService.clearSensitiveFields(user);

            Map<String, Object> info = new HashMap<>();
            info.put("user", user);
            info.put("token", tokenInfo.getToken());
            info.put("expire", tokenInfo.getExpireTime());

            return new Result<>(true, StatusCode.OK, "登录成功", info);
        } catch (UnsupportedOperationException e) {
            return new Result<>(false, StatusCode.ERROR, "该平台不支持此登录方式", null);
        } catch (Exception e) {
            logger.error("ID token verify failed for provider: {}", provider, e);
            return new Result<>(false, StatusCode.ERROR, "登录失败", null);
        }
    }
}
