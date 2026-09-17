package com.example.blog.aspect;

import com.example.blog.annotation.Idempotent;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IdempotencyAspectTest {

    private static final String REQUEST_ID = "rid-123";
    private static final String KEY = "idem:rid-123";

    private RedisTemplate<String, String> redisTemplate;
    private ValueOperations<String, String> valueOps;
    private ProceedingJoinPoint pjp;
    private MethodSignature signature;
    private IdempotencyAspect aspect;
    private ObjectMapper objectMapper;
    private MockHttpServletRequest request;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        redisTemplate = mock(RedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        objectMapper = new ObjectMapper();
        aspect = new IdempotencyAspect(redisTemplate, objectMapper, 50, 10);

        pjp = mock(ProceedingJoinPoint.class);
        signature = mock(MethodSignature.class);
        when(pjp.getSignature()).thenReturn(signature);
        when(signature.getMethod()).thenReturn(dummyMethod());

        request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private Method dummyMethod() throws NoSuchMethodException {
        return IdempotencyAspectTest.class.getMethod("dummy");
    }

    private Idempotent annotation() throws NoSuchMethodException {
        return dummyMethod().getAnnotation(Idempotent.class);
    }

    @Idempotent
    public Result<String> dummy() {
        return null;
    }

    private void withRequestId() {
        request.addHeader("X-Request-Id", REQUEST_ID);
    }

    private Result<String> ok(String data) {
        return new Result<>(true, StatusCode.OK, "ok", data);
    }

    @Test
    void firstRequest_proceedsAndCachesResult() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(true);
        Result<String> success = ok("c1");
        when(pjp.proceed()).thenReturn(success);

        Object result = aspect.around(pjp, annotation());

        assertEquals(success, result);
        verify(pjp).proceed();
        verify(valueOps).set(eq(KEY), anyString(), any(Duration.class));
    }

    @Test
    void retry_returnsCachedResultWithoutProceeding() throws Throwable {
        withRequestId();
        String cachedJson = objectMapper.writeValueAsString(ok("c1"));
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(false);
        when(valueOps.get(KEY)).thenReturn(cachedJson);

        Object result = aspect.around(pjp, annotation());

        assertInstanceOf(Result.class, result);
        @SuppressWarnings("unchecked")
        Result<String> cached = (Result<String>) result;
        assertEquals(true, cached.isFlag());
        assertEquals("c1", cached.getData());
        verify(pjp, never()).proceed();
    }

    @Test
    void failedResult_deletesKeySoRetryCanReprocess() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(true);
        Result<String> failure = new Result<>(false, StatusCode.ERROR, "校验失败", null);
        when(pjp.proceed()).thenReturn(failure);

        aspect.around(pjp, annotation());

        verify(redisTemplate).delete(KEY);
        verify(valueOps, never()).set(eq(KEY), anyString(), any(Duration.class));
    }

    @Test
    void noRequestId_proceedsWithoutRedis() throws Throwable {
        when(pjp.proceed()).thenReturn(ok("x"));

        Object result = aspect.around(pjp, annotation());

        assertEquals(ok("x"), result);
        verify(pjp).proceed();
        verify(valueOps, never()).setIfAbsent(any(), any(), any());
    }

    @Test
    void overlongRequestId_proceedsWithoutRedis() throws Throwable {
        request.addHeader("X-Request-Id", "a".repeat(200));
        when(pjp.proceed()).thenReturn(ok("x"));

        Object result = aspect.around(pjp, annotation());

        assertEquals(ok("x"), result);
        verify(valueOps, never()).setIfAbsent(any(), any(), any());
    }

    @Test
    void exception_deletesKeyAndRethrows() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(true);
        when(pjp.proceed()).thenThrow(new RuntimeException("boom"));

        assertThrows(RuntimeException.class, () -> aspect.around(pjp, annotation()));
        verify(redisTemplate).delete(KEY);
    }

    @Test
    void pendingFirstRequest_returnsInProgressResult() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(false);
        when(valueOps.get(KEY)).thenReturn("PENDING");

        Object result = aspect.around(pjp, annotation());

        assertTrue(result instanceof Result);
        Result<?> pending = (Result<?>) result;
        assertEquals(false, pending.isFlag());
        verify(pjp, never()).proceed();
    }
}
