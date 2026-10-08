package com.example.blog.hot.model;

import com.example.blog.dao.BenchmarkMetaRepository;
import com.example.blog.dao.HotCollectRunRepository;
import com.example.blog.dao.HotSourceRepository;
import com.example.blog.dao.ModelBenchmarkRepository;
import com.example.blog.dao.ModelBenchmarkSnapshotRepository;
import com.example.blog.dao.ModelPricingRepository;
import com.example.blog.hot.HotSourceKeys;
import com.example.blog.po.BenchmarkMeta;
import com.example.blog.po.HotCollectRun;
import com.example.blog.po.HotSource;
import com.example.blog.po.ModelBenchmark;
import com.example.blog.po.ModelBenchmarkSnapshot;
import com.example.blog.po.ModelEntity;
import com.example.blog.po.ModelPricing;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 模型榜单采集编排：抓取 → 归一 → 覆盖式写入 model_benchmark / model_pricing，
 * 同步 benchmark_meta 与信源健康，并记录运行日志。单源失败隔离。
 */
@Service
public class ModelLeaderboardService {

    private static final Log log = LogFactory.getLog(ModelLeaderboardService.class);

    private final List<ModelLeaderboardCollector> collectors;
    private final ModelNormalizer normalizer;
    private final BenchmarkRegistry benchmarkRegistry;
    private final BenchmarkMetaRepository benchmarkMetaRepository;
    private final ModelBenchmarkRepository benchmarkRepository;
    private final ModelBenchmarkSnapshotRepository snapshotRepository;
    private final ModelPricingRepository pricingRepository;
    private final HotSourceRepository sourceRepository;
    private final HotCollectRunRepository runRepository;

    @Value("${hot.collect.enabled:true}")
    private boolean enabled;

    public ModelLeaderboardService(List<ModelLeaderboardCollector> collectors,
                                   ModelNormalizer normalizer,
                                   BenchmarkRegistry benchmarkRegistry,
                                   BenchmarkMetaRepository benchmarkMetaRepository,
                                   ModelBenchmarkRepository benchmarkRepository,
                                   ModelBenchmarkSnapshotRepository snapshotRepository,
                                   ModelPricingRepository pricingRepository,
                                   HotSourceRepository sourceRepository,
                                   HotCollectRunRepository runRepository) {
        this.collectors = collectors;
        this.normalizer = normalizer;
        this.benchmarkRegistry = benchmarkRegistry;
        this.benchmarkMetaRepository = benchmarkMetaRepository;
        this.benchmarkRepository = benchmarkRepository;
        this.snapshotRepository = snapshotRepository;
        this.pricingRepository = pricingRepository;
        this.sourceRepository = sourceRepository;
        this.runRepository = runRepository;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int enabledCollectorCount() {
        return (int) collectors.stream().filter(ModelLeaderboardCollector::enabled).count();
    }

    @CacheEvict(value = {"modelLeaderboard", "modelBenchmarks", "modelDetail", "modelVendors",
            "modelTrend", "leaderboardTrend", "hotSources"}, allEntries = true)
    public HotCollectRun collectAll(String triggerType) {
        Date startedAt = new Date();
        HotCollectRun run = new HotCollectRun();
        run.setTriggerType(triggerType);
        run.setStartedAt(startedAt);

        syncBenchmarkMeta();

        int total = 0;
        int success = 0;
        int failed = 0;
        List<String> details = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (ModelLeaderboardCollector collector : collectors) {
            if (!collector.enabled()) {
                continue;
            }
            total++;
            HotSource source = syncSourceMeta(collector);
            source.setLastStatus("RUNNING");
            source.setLastRunAt(new Date());
            sourceRepository.save(source);

            try {
                List<ModelEntryData> entries = collector.fetch();
                int count = 0;
                for (ModelEntryData entry : entries) {
                    persist(collector, entry, today);
                    count++;
                }
                source.setItemCount(count);
                source.setLastStatus("SUCCESS");
                source.setLastSuccessAt(new Date());
                source.setLastError(null);
                sourceRepository.save(source);
                success++;
                details.add(collector.key() + ": 成功 " + count + " 个模型");
            } catch (Exception e) {
                failed++;
                source.setLastStatus("FAILED");
                source.setLastError(truncate(e.toString(), 2000));
                sourceRepository.save(source);
                details.add(collector.key() + ": 失败 " + e.getMessage());
                log.warn("模型榜单采集失败 " + collector.key() + "：" + e.getMessage());
            }
        }

        run.setFinishedAt(new Date());
        run.setTotalSources(total);
        run.setSuccessCount(success);
        run.setFailedCount(failed);
        run.setDetail(String.join("\n", details));
        runRepository.save(run);

        log.info("模型榜单采集完成：源 " + success + "/" + total + " 成功，触发方式 " + triggerType);
        return run;
    }

    private void persist(ModelLeaderboardCollector collector, ModelEntryData entry, LocalDate today) {
        ModelEntity model = normalizer.resolve(entry);

        Map<String, Double> benchmarks = entry.benchmarks();
        if (benchmarks != null) {
            for (Map.Entry<String, Double> e : benchmarks.entrySet()) {
                if (e.getValue() == null) {
                    continue;
                }
                ModelBenchmark row = benchmarkRepository
                        .findByModelIdAndBenchmarkKeyAndSourceKey(model.getId(), e.getKey(), collector.key())
                        .orElseGet(ModelBenchmark::new);
                if (row.getId() == null) {
                    row.setModelId(model.getId());
                    row.setBenchmarkKey(e.getKey());
                    row.setSourceKey(collector.key());
                }
                row.setScore(e.getValue());
                row.setRank(entry.rank());
                row.setSnapshotDate(today);
                row.setUpdatedAt(new Date());
                benchmarkRepository.save(row);
                saveSnapshot(model.getId(), e.getKey(), collector.key(), e.getValue(), entry.rank(), today);
            }
        }

        if (entry.inputPrice() != null || entry.outputPrice() != null || entry.contextWindow() != null) {
            ModelPricing pricing = pricingRepository
                    .findByModelIdAndSourceKey(model.getId(), collector.key())
                    .orElseGet(ModelPricing::new);
            if (pricing.getId() == null) {
                pricing.setModelId(model.getId());
                pricing.setSourceKey(collector.key());
                pricing.setCurrency("USD");
            }
            if (entry.inputPrice() != null) {
                pricing.setInputPrice(entry.inputPrice());
            }
            if (entry.outputPrice() != null) {
                pricing.setOutputPrice(entry.outputPrice());
            }
            if (entry.contextWindow() != null) {
                pricing.setContextWindow(entry.contextWindow());
            }
            pricing.setUpdatedAt(new Date());
            pricingRepository.save(pricing);
        }
    }

    private void syncBenchmarkMeta() {
        for (BenchmarkMetaData def : benchmarkRegistry.all()) {
            BenchmarkMeta meta = benchmarkMetaRepository.findByBenchmarkKey(def.key()).orElseGet(BenchmarkMeta::new);
            if (meta.getId() == null) {
                meta.setBenchmarkKey(def.key());
            }
            meta.setName(def.name());
            meta.setCategory(def.category());
            meta.setUnit(def.unit());
            meta.setHigherIsBetter(def.higherIsBetter());
            meta.setSourceKey(def.sourceKey());
            meta.setUpdatedAt(new Date());
            benchmarkMetaRepository.save(meta);
        }
    }

    private HotSource syncSourceMeta(ModelLeaderboardCollector collector) {
        HotSource source = sourceRepository.findBySourceKey(collector.key()).orElseGet(HotSource::new);
        source.setSourceKey(collector.key());
        source.setCategory(HotSourceKeys.CATEGORY_LEADERBOARD);
        source.setDisplayName(collector.displayName());
        source.setSourceUrl(collector.sourceUrl());
        source.setEnabled(collector.enabled());
        return source;
    }

    private void saveSnapshot(Long modelId, String benchmarkKey, String sourceKey,
                             Double score, Integer rank, LocalDate today) {
        ModelBenchmarkSnapshot snap = snapshotRepository
                .findByModelIdAndBenchmarkKeyAndSnapshotDate(modelId, benchmarkKey, today)
                .orElseGet(ModelBenchmarkSnapshot::new);
        if (snap.getId() == null) {
            snap.setModelId(modelId);
            snap.setBenchmarkKey(benchmarkKey);
            snap.setSnapshotDate(today);
        }
        snap.setSourceKey(sourceKey);
        snap.setScore(score);
        snap.setRank(rank);
        snapshotRepository.save(snap);
    }

    private String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
