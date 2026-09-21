package com.example.blog.service.impl;

import com.example.blog.dao.BlogVisitorRepository;
import com.example.blog.service.VisitorTrackService;
import com.example.blog.util.GeoIpUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class VisitorTrackServiceImpl implements VisitorTrackService {

    private static final Logger logger = LoggerFactory.getLogger(VisitorTrackServiceImpl.class);

    private final BlogVisitorRepository repository;

    // ip -> 待写入记录（含区域与最近访问时间）；由 flush 消费
    private final Map<String, GeoIpUtils.Location> pending = new HashMap<>();

    public VisitorTrackServiceImpl(BlogVisitorRepository repository) {
        this.repository = repository;
    }

    @Override
    public void track(String ip, GeoIpUtils.Location location) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        synchronized (pending) {
            pending.put(ip, location != null ? location : new GeoIpUtils.Location(null, null, null));
        }
    }

    @Override
    public int flushBuffer() {
        Map<String, GeoIpUtils.Location> batch;
        synchronized (pending) {
            if (pending.isEmpty()) {
                return 0;
            }
            batch = new HashMap<>(pending);
            pending.clear();
        }
        ZonedDateTime now = ZonedDateTime.now();
        int count = 0;
        for (Map.Entry<String, GeoIpUtils.Location> e : batch.entrySet()) {
            GeoIpUtils.Location loc = e.getValue();
            try {
                // 不加方法级 @Transactional：让每条 upsert 各自走独立短事务
                // （Spring Data @Modifying 默认自带事务），避免单条失败 abort 整个批次导致丢数据。
                repository.upsertVisit(e.getKey(),
                        loc != null ? loc.country() : null,
                        loc != null ? loc.province() : null,
                        loc != null ? loc.city() : null,
                        now);
                count++;
            } catch (Exception ex) {
                logger.warn("访客 IP 落库失败，回填缓冲: {} - {}", e.getKey(), ex.getMessage());
                synchronized (pending) {
                    pending.put(e.getKey(), loc);
                }
            }
        }
        return count;
    }

    @Override
    public long getBufferedCount() {
        synchronized (pending) {
            return pending.size();
        }
    }

    // 丢弃缓冲（仅清空不写库），供清理操作使用，避免清理后又被定时任务写回
    @Override
    public void discardBuffer() {
        synchronized (pending) {
            pending.clear();
        }
    }

    @Scheduled(fixedDelay = 30000)
    public void scheduledFlush() {
        int flushed = flushBuffer();
        if (flushed > 0) {
            logger.info("访客 IP 批量落库 {} 条", flushed);
        }
    }
}