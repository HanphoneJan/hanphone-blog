package com.example.blog.hot;

import com.example.blog.hot.model.ModelLeaderboardService;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 采集触发器：异步执行「热点 + 模型榜单」全量采集，避免后台请求超时。
 * 同一时间只允许一个任务运行。
 */
@Service
public class HotTriggerService {

    private static final Log log = LogFactory.getLog(HotTriggerService.class);

    private final HotCollectService hotCollectService;
    private final ModelLeaderboardService modelLeaderboardService;

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "hot-collect");
        t.setDaemon(true);
        return t;
    });

    private final AtomicBoolean running = new AtomicBoolean(false);

    public HotTriggerService(HotCollectService hotCollectService,
                             ModelLeaderboardService modelLeaderboardService) {
        this.hotCollectService = hotCollectService;
        this.modelLeaderboardService = modelLeaderboardService;
    }

    public boolean isRunning() {
        return running.get();
    }

    /** 异步触发一次全量采集；若已在运行返回 false */
    public boolean trigger() {
        if (!running.compareAndSet(false, true)) {
            return false;
        }
        executor.submit(() -> {
            try {
                hotCollectService.collectAll("MANUAL");
                modelLeaderboardService.collectAll("MANUAL");
            } catch (Exception e) {
                log.error("采集任务异常", e);
            } finally {
                running.set(false);
            }
        });
        return true;
    }
}
