package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.VisitorTrackService;
import com.example.blog.util.ClientIpUtil;
import com.example.blog.util.GeoIpUtils;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;

@RestController
public class VisitorTrackController {

    // 每 IP 每分钟最多 60 次埋点，防刷且不误伤正常浏览
    private static final int MAX_PER_MINUTE = 60;
    private static final String RATE_KEY_PREFIX = "rl:track:";

    private final VisitorTrackService trackService;
    private final GeoIpUtils geoIpUtils;
    private final RedisTemplate<String, String> redisTemplate;

    public VisitorTrackController(VisitorTrackService trackService,
                                  GeoIpUtils geoIpUtils,
                                  RedisTemplate<String, String> redisTemplate) {
        this.trackService = trackService;
        this.geoIpUtils = geoIpUtils;
        this.redisTemplate = redisTemplate;
    }

    @PostMapping("/visit/track")
    public Result<Void> track(HttpServletRequest request) {
        String ip = ClientIpUtil.getClientIp(request);
        if (rateLimited(ip)) {
            return new Result<>(false, StatusCode.REPERROR, "操作过于频繁", null);
        }
        GeoIpUtils.Location loc = geoIpUtils.lookup(ip);
        trackService.track(ip, loc);
        // 埋点无业务返回体，仅确认收到
        return new Result<>(true, StatusCode.OK, "ok", null);
    }

    private boolean rateLimited(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        try {
            ValueOperations<String, String> ops = redisTemplate.opsForValue();
            Long count = ops.increment(RATE_KEY_PREFIX + ip);
            if (count != null && count == 1) {
                redisTemplate.expire(RATE_KEY_PREFIX + ip, Duration.ofMinutes(1));
            }
            return count != null && count > MAX_PER_MINUTE;
        } catch (Exception e) {
            // Redis 异常时放行，避免限流拖垮埋点
            return false;
        }
    }
}