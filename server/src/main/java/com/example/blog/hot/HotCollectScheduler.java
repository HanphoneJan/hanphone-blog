package com.example.blog.hot;

import com.example.blog.hot.model.ModelLeaderboardService;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 洞察每日采集调度。cron 由 `hot.collect.cron` 配置，默认每日 03:30。
 * 先采集热点条目，再采集模型榜单。
 */
@Component
public class HotCollectScheduler {

    private static final Log log = LogFactory.getLog(HotCollectScheduler.class);

    private final HotCollectService collectService;
    private final ModelLeaderboardService modelLeaderboardService;

    public HotCollectScheduler(HotCollectService collectService,
                               ModelLeaderboardService modelLeaderboardService) {
        this.collectService = collectService;
        this.modelLeaderboardService = modelLeaderboardService;
    }

    @Scheduled(cron = "${hot.collect.cron:0 30 3 * * *}")
    public void scheduledCollect() {
        if (!collectService.isEnabled()) {
            log.info("洞察采集已关闭（hot.collect.enabled=false）");
            return;
        }
        collectService.collectAll("SCHEDULED");
        modelLeaderboardService.collectAll("SCHEDULED");
    }
}
