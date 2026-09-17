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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;

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
    void cacheFailure_keepsDoneMarkerSoRetryDoesNotDuplicate() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(true);
        when(pjp.proceed()).thenReturn(ok("c1"));
        doThrow(new RuntimeException("serialize fail"))
                .when(valueOps).set(eq(KEY), anyString(), any(Duration.class));

        aspect.around(pjp, annotation());

        // 业务成功但缓存失败时：不得删除幂等键（否则重试会重复写入），应写入 DONE 完成标记
        verify(redisTemplate, never()).delete(KEY);
        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(valueOps).set(eq(KEY), eq("DONE"), ttlCaptor.capture());
        // DONE 标记必须用完整 TTL（与成功缓存一致）：若用短 pendingTtl，过期后重试会重新抢占并重复写入
        assertEquals(Duration.ofSeconds(annotation().ttlSeconds()), ttlCaptor.getValue());
    }

    @Test
    void retrySeesDoneMarker_returnsProcessedMessageWithoutProceeding() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(false);
        when(valueOps.get(KEY)).thenReturn("DONE");

        Object result = aspect.around(pjp, annotation());

        assertInstanceOf(Result.class, result);
        Result<?> done = (Result<?>) result;
        assertEquals(false, done.isFlag());
        assertEquals("请求已处理成功，请勿重复提交", done.getMessage());
        verify(pjp, never()).proceed();
    }

    @Test
    void nullKey_reacquiresBeforeExecuting_toAvoidConcurrentDuplicates() throws Throwable {
        withRequestId();
        // 首个请求失败释放 key，两个并发重试同时看到 null
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(false);
        when(valueOps.get(KEY)).thenReturn(null);
        // 其中一个重试抢占成功，执行业务
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class)))
                .thenReturn(false, true);
        Result<String> success = ok("c1");
        when(pjp.proceed()).thenReturn(success);

        Object result = aspect.around(pjp, annotation());

        assertEquals(success, result);
        verify(pjp).proceed();
    }

    @Test
    void concurrentRetryLosesReacquire_waitsForWinner() throws Throwable {
        withRequestId();
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class))).thenReturn(false);
        // get 先返回 null（首个失败），随后抢占失败（另一重试已抢），再读到 PENDING
        when(valueOps.get(KEY)).thenReturn(null, "PENDING");
        when(valueOps.setIfAbsent(eq(KEY), eq("PENDING"), any(Duration.class)))
                .thenReturn(false, false);

        Object result = aspect.around(pjp, annotation());

        assertInstanceOf(Result.class, result);
        Result<?> pending = (Result<?>) result;
        assertEquals(false, pending.isFlag());
        verify(pjp, never()).proceed();
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
    void singlePublicConstructor_forSpringAutowiring() {
        assertEquals(1, IdempotencyAspect.class.getConstructors().length,
                "必须保持单一构造器，Spring 才能自动注入（多构造器会导致 No default constructor found）");
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
