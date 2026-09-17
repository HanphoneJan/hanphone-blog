package com.example.blog.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PublicWriteRateLimitFilterTest {

    private ValueOperations<String, String> valueOps;
    private PublicWriteRateLimitFilter filter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(1L);
        filter = new PublicWriteRateLimitFilter(redisTemplate);
    }

    @Test
    void rateLimitKeyIsNormalizedAcrossIds() throws Exception {
        filter.doFilter(new MockHttpServletRequest("POST", "/comments/123"),
                new MockHttpServletResponse(), new MockFilterChain());
        filter.doFilter(new MockHttpServletRequest("POST", "/comments/456"),
                new MockHttpServletResponse(), new MockFilterChain());

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(valueOps, times(2)).increment(captor.capture());
        assertEquals(captor.getAllValues().get(0), captor.getAllValues().get(1));
    }

    @Test
    void spoofedXForwardedForIsNotTrusted() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/comments");
        request.setRemoteAddr("9.9.9.9");
        request.addHeader("X-Forwarded-For", "1.2.3.4");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(valueOps).increment(captor.capture());
        assertTrue(captor.getValue().contains("9.9.9.9"));
        assertFalse(captor.getValue().contains("1.2.3.4"));
    }

    @Test
    void xRealIpFromTrustedProxyIsUsed() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/comments");
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Real-IP", "5.5.5.5");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(valueOps).increment(captor.capture());
        assertTrue(captor.getValue().contains("5.5.5.5"));
    }

    @Test
    void spoofedXRealIpFromDirectClientIsNotTrusted() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/comments");
        request.setRemoteAddr("9.9.9.9");
        request.addHeader("X-Real-IP", "1.2.3.4");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(valueOps).increment(captor.capture());
        assertTrue(captor.getValue().contains("9.9.9.9"));
        assertFalse(captor.getValue().contains("1.2.3.4"));
    }
}
