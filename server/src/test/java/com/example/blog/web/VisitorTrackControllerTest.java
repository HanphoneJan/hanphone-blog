package com.example.blog.web;

import com.example.blog.dao.BlogVisitorRepository;
import com.example.blog.service.impl.VisitorTrackServiceImpl;
import com.example.blog.util.GeoIpUtils;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VisitorTrackControllerTest {

    @SuppressWarnings("unchecked")
    @Test
    void trackInvokesService() {
        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(1L);

        BlogVisitorRepository repo = mock(BlogVisitorRepository.class);
        VisitorTrackServiceImpl service = new VisitorTrackServiceImpl(repo);
        GeoIpUtils geoIp = new GeoIpUtils(); // reader 为 null，降级未知区域

        VisitorTrackController controller = new VisitorTrackController(service, geoIp, redisTemplate);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/visit/track");
        req.setRemoteAddr("127.0.0.1");
        controller.track(req);

        // service.track 成功入缓冲
        assertEquals(1, service.getBufferedCount());
    }
}