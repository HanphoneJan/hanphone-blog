package com.example.blog.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class PublicWriteRateLimitFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(PublicWriteRateLimitFilter.class);

    private final RedisTemplate<String, String> redisTemplate;

    public PublicWriteRateLimitFilter(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private static final int MAX_PER_MINUTE = 10;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod()) && !"DELETE".equals(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        return !(uri.matches("^/blog/\\d+/like$") ||
                uri.matches("^/comments$") ||
                uri.matches("^/comments/\\d+$") ||
                uri.matches("^/messages$") ||
                uri.matches("^/messages/\\d+$") ||
                uri.matches("^/essays/\\d+/like$") ||
                uri.matches("^/essays/\\d+/comments$") ||
                uri.matches("^/essays/comments/\\d+$"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            String ip = getClientIp(request);
            String normalizedUri = request.getRequestURI().replaceAll("/\\d+", "/{id}");
            String key = "rl:write:" + ip + ":" + normalizedUri;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(1));
            }
            if (count != null && count > MAX_PER_MINUTE) {
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"flag\":false,\"code\":429,\"message\":\"操作过于频繁，请稍后再试\"}");
                response.getWriter().flush();
                return;
            }
        } catch (Exception e) {
            // Redis 异常时放行，避免限流组件拖垮正常写请求
            logger.warn("限流检查失败，放行请求: " + e.getMessage());
        }
        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        // 仅信任反向代理（nginx）覆写的 X-Real-IP；X-Forwarded-For 可由客户端伪造
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}