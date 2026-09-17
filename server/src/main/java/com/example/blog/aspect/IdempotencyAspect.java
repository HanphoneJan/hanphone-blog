package com.example.blog.aspect;

import com.example.blog.annotation.Idempotent;
import com.example.blog.po.Result;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.time.Duration;

/**
 * 幂等切面：配合客户端生成的 X-Request-Id 幂等键去重。
 * - 首次请求：SET NX 占位成功则执行业务；成功缓存响应，失败释放幂等键。
 * - 重试请求：返回缓存的首次响应（或首个请求仍处理中时返回提示），不再重复执行业务。
 * - Redis 异常时放行，避免幂等组件拖垮正常写请求。
 */
@Aspect
@Component
public class IdempotencyAspect {

    private static final Logger logger = LoggerFactory.getLogger(IdempotencyAspect.class);

    private static final String HEADER_REQUEST_ID = "X-Request-Id";
    private static final String KEY_PREFIX = "idem:";
    private static final String VALUE_PENDING = "PENDING";
    private static final int MAX_REQUEST_ID_LENGTH = 128;

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final long maxWaitMs;
    private final long pollIntervalMs;

    public IdempotencyAspect(RedisTemplate<String, String> redisTemplate,
            ObjectMapper objectMapper,
            @Value("${idempotency.max-wait-ms:3000}") long maxWaitMs,
            @Value("${idempotency.poll-interval-ms:100}") long pollIntervalMs) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.maxWaitMs = maxWaitMs;
        this.pollIntervalMs = pollIntervalMs;
    }

    @Around("@annotation(idempotent)")
    public Object around(ProceedingJoinPoint pjp, Idempotent idempotent) throws Throwable {
        String requestId = requestId();
        if (requestId == null) {
            // 未携带幂等键时按原逻辑放行
            return pjp.proceed();
        }

        String key = KEY_PREFIX + requestId;
        try {
            Duration ttl = Duration.ofSeconds(idempotent.ttlSeconds());
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, VALUE_PENDING, ttl);
            if (Boolean.TRUE.equals(acquired)) {
                return executeFirst(pjp, key, ttl);
            }
            return replayOrWait(pjp, key);
        } catch (Exception e) {
            logger.warn("幂等处理异常，放行请求: {}", e.getMessage());
            return pjp.proceed();
        }
    }

    private Object executeFirst(ProceedingJoinPoint pjp, String key, Duration ttl) throws Throwable {
        try {
            Object result = pjp.proceed();
            if (isFailure(result)) {
                // 业务失败不缓存，释放幂等键，让重试可以重新执行
                redisTemplate.delete(key);
                return result;
            }
            try {
                redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(result), ttl);
            } catch (Exception e) {
                // 响应缓存失败（如序列化异常）不阻塞主流程，释放幂等键允许重试
                logger.warn("缓存幂等响应失败，释放幂等键: {}", e.getMessage());
                redisTemplate.delete(key);
            }
            return result;
        } catch (Throwable t) {
            redisTemplate.delete(key);
            throw t;
        }
    }

    private Object replayOrWait(ProceedingJoinPoint pjp, String key) throws Throwable {
        long deadline = System.currentTimeMillis() + maxWaitMs;
        while (System.currentTimeMillis() < deadline) {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached == null) {
                // 首个请求已失败并释放幂等键，直接重新执行
                return pjp.proceed();
            }
            if (!VALUE_PENDING.equals(cached)) {
                Method method = ((MethodSignature) pjp.getSignature()).getMethod();
                JavaType type = objectMapper.getTypeFactory().constructType(method.getGenericReturnType());
                return objectMapper.readValue(cached, type);
            }
            Thread.sleep(pollIntervalMs);
        }
        // 首个请求仍在处理中
        return new Result<>(false, com.example.blog.po.StatusCode.ERROR, "请求正在处理中，请勿重复提交", null);
    }

    private boolean isFailure(Object result) {
        return result instanceof Result && !((Result<?>) result).isFlag();
    }

    private String requestId() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
            return null;
        }
        HttpServletRequest request = servletAttrs.getRequest();
        String requestId = request.getHeader(HEADER_REQUEST_ID);
        if (requestId == null || requestId.isBlank() || requestId.length() > MAX_REQUEST_ID_LENGTH) {
            return null;
        }
        return requestId.trim();
    }
}