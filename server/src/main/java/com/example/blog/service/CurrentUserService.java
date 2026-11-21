package com.example.blog.service;

import com.example.blog.enums.UserType;
import com.example.blog.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

/**
 * 统一解析请求里的登录用户。
 *
 * 与 {@link com.example.blog.interceptor.TokenInterceptor} 保持同一套规则：
 * - 从 `token` 头取 JWT，去掉前后双引号；
 * - 校验签名与过期时间；
 * - 比对密码版本 `pwdv`，改密码后旧 access token 立即失效（老 token 无该 claim 时放行）。
 */
@Service
public class CurrentUserService {

    private final PasswordVersionService passwordVersionService;

    public CurrentUserService(PasswordVersionService passwordVersionService) {
        this.passwordVersionService = passwordVersionService;
    }

    /**
     * 解析当前登录用户。
     *
     * @return 未携带 token、token 无效/过期、密码版本不符时返回 {@code null}
     */
    public CurrentUser resolve(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return null;
        }

        if (!TokenUtil.verify(token)) {
            return null;
        }

        Long userId = TokenUtil.getUserId(token);
        if (userId == null) {
            return null;
        }

        // 密码版本校验：改过密码后，旧 access token 立即失效（老 token 无该 claim，兼容期内放行）
        Integer tokenPwdv = TokenUtil.getPasswordVersion(token);
        if (tokenPwdv != null && passwordVersionService.current(userId) != tokenPwdv) {
            return null;
        }

        boolean admin = UserType.ADMIN.getCode().equals(TokenUtil.getUserType(token));
        return new CurrentUser(userId, admin);
    }

    private String extractToken(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String token = request.getHeader("token");
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        // 处理 token 格式（去掉前后双引号），与 TokenInterceptor 一致
        token = token.trim();
        if (token.startsWith("\"") && token.endsWith("\"") && token.length() > 1) {
            token = token.substring(1, token.length() - 1);
        }

        return token.isEmpty() ? null : token;
    }
}
