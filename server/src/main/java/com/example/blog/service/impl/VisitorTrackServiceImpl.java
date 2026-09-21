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

    // ip -> 缓冲计数（该 flush 窗口内访问次数）；由 flush 消费，同一 IP 累加计次
    private final Map<String, PendingVisit> pending = new HashMap<>();

    // 缓冲内单 IP 记录：区域 + 窗口内累计次数
    private static final class PendingVisit {
        final GeoIpUtils.Location location;
        int count;

        PendingVisit(GeoIpUtils.Location location) {
            this.location = location;
            this.count = 1;
        }
    }

    public VisitorTrackServiceImpl(BlogVisitorRepository repository) {
        this.repository = repository;
    }

    @Override
    public void track(String ip, GeoIpUtils.Location location) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        GeoIpUtils.Location loc = location != null ? location : new GeoIpUtils.Location(null, null, null);
        synchronized (pending) {
            PendingVisit pv = pending.get(ip);
            if (pv == null) {
                pending.put(ip, new PendingVisit(loc));
            } else {
                // 同一 flush 窗口内同 IP 多次访问，累计计数（避免 PV 被低估）
                pv.count++;
            }
        }
    }

    @Override
    public int flushBuffer() {
        Map<String, PendingVisit> batch;
        synchronized (pending) {
            if (pending.isEmpty()) {
                return 0;
            }
            batch = new HashMap<>(pending);
            pending.clear();
        }
        ZonedDateTime now = ZonedDateTime.now();
        int count = 0;
        for (Map.Entry<String, PendingVisit> e : batch.entrySet()) {
            PendingVisit pv = e.getValue();
            GeoIpUtils.Location loc = pv.location;
            try {
                // 不加方法级 @Transactional：让每条 upsert 各自走独立短事务
                // （Spring Data @Modifying 默认自带事务），避免单条失败 abort 整个批次导致丢数据。
                repository.upsertVisit(e.getKey(),
                        loc != null ? loc.country() : null,
                        loc != null ? loc.province() : null,
                        loc != null ? loc.city() : null,
                        pv.count,
                        now);
                count += pv.count;
            } catch (Exception ex) {
                logger.warn("访客 IP 落库失败，回填缓冲: {} - {}", e.getKey(), ex.getMessage());
                synchronized (pending) {
                    PendingVisit existing = pending.get(e.getKey());
                    if (existing == null) {
                        pending.put(e.getKey(), pv);
                    } else {
                        existing.count += pv.count;
                    }
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