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
    private static final String VALUE_DONE = "DONE";
    private static final int MAX_REQUEST_ID_LENGTH = 128;
    // 占位阶段 TTL 上限：首个请求崩溃/超时时，短 TTL 能尽快让重试重新执行；成功后再续期为完整 TTL
    private static final long PENDING_TTL_SECONDS = 60L;

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
        Duration ttl = Duration.ofSeconds(idempotent.ttlSeconds());
        Duration pendingTtl = Duration.ofSeconds(Math.min(ttl.getSeconds(), PENDING_TTL_SECONDS));
        Boolean acquired;
        try {
            acquired = redisTemplate.opsForValue().setIfAbsent(key, VALUE_PENDING, pendingTtl);
        } catch (Exception e) {
            // 占位失败（如 Redis 不可用）说明业务尚未执行，放行请求避免幂等组件拖垮写请求
            logger.warn("幂等占位失败，放行请求: {}", e.getMessage());
            return pjp.proceed();
        }
        if (Boolean.TRUE.equals(acquired)) {
            return executeFirst(pjp, key, ttl);
        }
        return replayOrWait(pjp, key, ttl, pendingTtl);
    }

    private Object executeFirst(ProceedingJoinPoint pjp, String key, Duration ttl) throws Throwable {
        try {
            Object result = pjp.proceed();
            if (isFailure(result)) {
                // 业务失败不缓存，释放幂等键，让重试可以重新执行
                deleteQuietly(key);
                return result;
            }
            try {
                redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(result), ttl);
            } catch (Exception e) {
                // 响应缓存失败（如序列化异常）不阻塞主流程：业务已成功，绝不能释放幂等键，
                // 否则重试会重复写入；改为保留完成标记，重试时提示已处理而不重复执行。
                // 标记必须用完整 TTL（与成功缓存一致）：若用短 pendingTtl，过期后重试会重新抢占并重复写入。
                logger.warn("缓存幂等响应失败，保留完成标记: {}", e.getMessage());
                setQuietly(key, VALUE_DONE, ttl);
            }
            return result;
        } catch (Throwable t) {
            deleteQuietly(key);
            throw t;
        }
    }

    private Object replayOrWait(ProceedingJoinPoint pjp, String key, Duration ttl, Duration pendingTtl) throws Throwable {
        long deadline = System.currentTimeMillis() + maxWaitMs;
        while (System.currentTimeMillis() < deadline) {
            String cached;
            try {
                cached = redisTemplate.opsForValue().get(key);
            } catch (Exception e) {
                // 重试阶段 Redis 不可用，无法确认首个请求状态；返回处理中提示，避免重复执行
                logger.warn("幂等重试读取失败，返回处理中提示: {}", e.getMessage());
                return new Result<>(false, com.example.blog.po.StatusCode.ERROR, "请求正在处理中，请勿重复提交", null);
            }
            if (cached == null) {
                // 首个请求已失败并释放幂等键。并发重试可能同时看到 null 并重复执行业务，
                // 因此必须再次抢占幂等键，抢到的那个才执行，其余重试继续等待。
                Boolean reAcquired;
                try {
                    reAcquired = redisTemplate.opsForValue().setIfAbsent(key, VALUE_PENDING, pendingTtl);
                } catch (Exception e) {
                    logger.warn("幂等重试抢占失败，返回处理中提示: {}", e.getMessage());
                    return new Result<>(false, com.example.blog.po.StatusCode.ERROR, "请求正在处理中，请勿重复提交", null);
                }
                if (Boolean.TRUE.equals(reAcquired)) {
                    return executeFirst(pjp, key, ttl);
                }
                Thread.sleep(pollIntervalMs);
                continue;
            }
            if (VALUE_DONE.equals(cached)) {
                // 业务已成功但响应缓存失败，无法返回结果；提示已处理，避免重试重复写入
                return new Result<>(false, com.example.blog.po.StatusCode.ERROR, "请求已处理成功，请勿重复提交", null);
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

    private void deleteQuietly(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            logger.warn("释放幂等键失败: {}", e.getMessage());
        }
    }

    private void setQuietly(String key, String value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            logger.warn("写入幂等标记失败: {}", e.getMessage());
        }
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