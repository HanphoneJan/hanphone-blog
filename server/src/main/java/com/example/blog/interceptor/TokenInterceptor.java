package com.example.blog.interceptor;

import com.example.blog.util.TokenUtil;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Component
public class TokenInterceptor implements HandlerInterceptor {
    private static final Log log = LogFactory.getLog(TokenInterceptor.class);

    // 错误码常量
    private static final String CODE_TOKEN_EMPTY = "50001";
    private static final String CODE_TOKEN_INVALID = "50002";
    private static final String CODE_TOKEN_VERIFY_FAIL = "50000";

    // 错误消息常量
    private static final String MSG_TOKEN_EMPTY = "token is empty";
    private static final String MSG_TOKEN_INVALID = "token format is invalid";
    private static final String MSG_TOKEN_VERIFY_FAIL = "token verify fail";

    // HTTP状态码常量
    private static final int STATUS_BAD_REQUEST = 400;
    private static final int STATUS_UNAUTHORIZED = 401;

    @Override
    public boolean preHandle(HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) throws Exception {
        // 对 OPTIONS 请求放行，用于处理跨域预检
        if ("OPTIONS".equals(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return true;
        }

        // 设置响应编码和内容类型
        response.setCharacterEncoding("utf-8");
        response.setContentType("application/json; charset=utf-8");

        // 获取并验证 token
        String token = extractToken(request);
        if (token == null) {
            handleAuthFailure(response, STATUS_BAD_REQUEST, CODE_TOKEN_EMPTY, MSG_TOKEN_EMPTY, "认证失败，请求头中未携带token");
            return false;
        }

        // 验证 token
        if (!TokenUtil.adminVerify(token)) {
            handleAuthFailure(response, STATUS_UNAUTHORIZED, CODE_TOKEN_VERIFY_FAIL, MSG_TOKEN_VERIFY_FAIL, "认证失败，未通过拦截器");
            return false;
        }

        return true;
    }

    /**
     * 从请求中提取并处理 token
     * @param request HTTP 请求
     * @return 处理后的 token，如果无效则返回 null
     */
    private String extractToken(HttpServletRequest request) {
        String token = request.getHeader("token");

        // 检查 token 是否为空
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        // 处理 token 格式（去掉前后双引号）
        token = token.trim();
        if (token.startsWith("\"") && token.endsWith("\"") && token.length() > 1) {
            token = token.substring(1, token.length() - 1);
        }

        // 检查 token 长度是否有效
        if (token.isEmpty()) {
            return null;
        }

        return token;
    }

    /**
     * 处理认证失败的情况
     * @param response HTTP 响应
     * @param httpStatus HTTP状态码
     * @param code 业务错误码
     * @param message 错误消息
     * @param logMessage 日志消息
     * @throws Exception 写入响应时可能抛出的异常
     */
    private void handleAuthFailure(HttpServletResponse response, int httpStatus, String code, String message, String logMessage) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode json = mapper.createObjectNode();
        json.put("msg", message);
        json.put("code", code);

        response.setStatus(httpStatus);
        response.getWriter().append(mapper.writeValueAsString(json));
        log.warn(logMessage);
    }
}