package com.example.blog.hot;

import com.example.blog.dao.HotCollectRunRepository;
import com.example.blog.dao.HotItemRepository;
import com.example.blog.dao.HotItemSnapshotRepository;
import com.example.blog.dao.HotSourceRepository;
import com.example.blog.hot.collector.HotCollector;
import com.example.blog.hot.collector.HotItemData;
import com.example.blog.hot.summary.HotSummaryService;
import com.example.blog.po.HotCollectRun;
import com.example.blog.po.HotItem;
import com.example.blog.po.HotItemSnapshot;
import com.example.blog.po.HotSource;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 洞察采集编排：调度各采集器 → upsert 条目 → 写当日快照 → 更新源健康 → 记录运行日志。
 *
 * <p>单个信源失败会被隔离，仅更新该源状态，不影响其余信源。</p>
 */
@Service
public class HotCollectService {

    private static final Log log = LogFactory.getLog(HotCollectService.class);

    private final List<HotCollector> collectors;
    private final HotSourceRepository sourceRepository;
    private final HotItemRepository itemRepository;
    private final HotItemSnapshotRepository snapshotRepository;
    private final HotCollectRunRepository runRepository;
    private final HotSummaryService summaryService;

    @Value("${hot.collect.enabled:true}")
    private boolean enabled;

    public HotCollectService(List<HotCollector> collectors,
                             HotSourceRepository sourceRepository,
                             HotItemRepository itemRepository,
                             HotItemSnapshotRepository snapshotRepository,
                             HotCollectRunRepository runRepository,
                             HotSummaryService summaryService) {
        this.collectors = collectors;
        this.sourceRepository = sourceRepository;
        this.itemRepository = itemRepository;
        this.snapshotRepository = snapshotRepository;
        this.runRepository = runRepository;
        this.summaryService = summaryService;
    }

    public boolean isEnabled() {
        return enabled;
    }

    @CacheEvict(value = {"hotOverview", "hotFeed", "hotSources"}, allEntries = true)
    public HotCollectRun collectAll(String triggerType) {
        Date startedAt = new Date();
        HotCollectRun run = new HotCollectRun();
        run.setTriggerType(triggerType);
        run.setStartedAt(startedAt);

        int total = 0;
        int success = 0;
        int failed = 0;
        List<String> details = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (HotCollector collector : collectors) {
            if (!collector.enabled()) {
                continue;
            }
            total++;
            HotSource source = syncSourceMeta(collector);
            source.setLastStatus("RUNNING");
            source.setLastRunAt(new Date());
            sourceRepository.save(source);

            try {
                List<HotItemData> data = collector.fetch();
                int count = 0;
                for (HotItemData d : data) {
                    upsertItem(collector, d, today);
                    count++;
                }
                source.setItemCount(count);
                source.setLastStatus("SUCCESS");
                source.setLastSuccessAt(new Date());
                source.setLastError(null);
                sourceRepository.save(source);
                success++;
                details.add(collector.key() + ": 成功 " + count + " 条");
            } catch (Exception e) {
                failed++;
                source.setLastStatus("FAILED");
                source.setLastError(truncate(e.toString(), 2000));
                sourceRepository.save(source);
                details.add(collector.key() + ": 失败 " + e.getMessage());
                log.warn("洞察采集失败 " + collector.key() + "：" + e.getMessage());
            }
        }

        run.setFinishedAt(new Date());
        run.setTotalSources(total);
        run.setSuccessCount(success);
        run.setFailedCount(failed);
        run.setDetail(String.join("\n", details));
        runRepository.save(run);

        log.info("洞察采集完成：源 " + success + "/" + total + " 成功，触发方式 " + triggerType);
        return run;
    }

    private HotSource syncSourceMeta(HotCollector collector) {
        HotSource source = sourceRepository.findBySourceKey(collector.key()).orElseGet(HotSource::new);
        source.setSourceKey(collector.key());
        source.setCategory(collector.category());
        source.setDisplayName(collector.displayName());
        source.setSourceUrl(collector.sourceUrl());
        source.setEnabled(collector.enabled());
        return source;
    }

    private void upsertItem(HotCollector collector, HotItemData d, LocalDate today) {
        HotItem item = itemRepository.findBySourceKeyAndItemKey(collector.key(), d.itemKey())
                .orElseGet(HotItem::new);
        Date now = new Date();
        if (item.getId() == null) {
            item.setSourceKey(collector.key());
            item.setItemKey(d.itemKey());
            item.setFirstSeenAt(now);
        }
        item.setCategory(d.category() != null && !d.category().isBlank() ? d.category() : collector.category());
        item.setTitle(d.title());
        item.setUrl(d.url());
        item.setAuthor(d.author());
        item.setTags(d.tags());
        item.setScore(d.score());
        item.setRank(d.rank());
        item.setExtra(d.extra());
        item.setPublishedAt(d.publishedAt());
        item.setLastSeenAt(now);
        item.setCollectedAt(now);

        // 仅对新条目生成一次中文摘要，避免重复消耗
        if (item.getSummaryZh() == null && summaryService.isEnabled()) {
            String summary = summaryService.summarize(d.title(), d.extra());
            if (summary != null) {
                item.setSummaryZh(summary);
            }
        }

        itemRepository.save(item);
        saveSnapshot(item, today);
    }

    private void saveSnapshot(HotItem item, LocalDate today) {
        HotItemSnapshot snap = snapshotRepository
                .findByItemKeyAndSnapshotDate(item.getItemKey(), today)
                .orElseGet(HotItemSnapshot::new);
        if (snap.getId() == null) {
            snap.setItemKey(item.getItemKey());
            snap.setSnapshotDate(today);
        }
        snap.setSourceKey(item.getSourceKey());
        snap.setScore(item.getScore());
        snap.setRank(item.getRank());
        snapshotRepository.save(snap);
    }

    private String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
