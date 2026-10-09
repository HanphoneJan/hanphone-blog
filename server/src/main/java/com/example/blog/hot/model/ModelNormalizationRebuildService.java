package com.example.blog.hot.model;

import com.example.blog.dao.ModelAliasRepository;
import com.example.blog.dao.ModelBenchmarkRepository;
import com.example.blog.dao.ModelBenchmarkSnapshotRepository;
import com.example.blog.dao.ModelEntityRepository;
import com.example.blog.dao.ModelPricingRepository;
import com.example.blog.po.ModelAlias;
import com.example.blog.po.ModelBenchmark;
import com.example.blog.po.ModelBenchmarkSnapshot;
import com.example.blog.po.ModelEntity;
import com.example.blog.po.ModelPricing;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 一次性维护：按**当前**归一规则重建 {@code model_entity.canonical_key}，并合并历史重复实体。
 *
 * <p>背景：{@link ModelNormalizer#resolve} 先按 alias 命中原实体、再算 canonical_key，
 * 因此「归一规则引入前建库」的实体其旧 canonical_key 不会在重采时自动重算，会与
 * 新命名分裂（如 {@code spacexai:grok-4-7} 与 {@code xai:grok-4-7}）。本服务把同一新 key
 * 的实体合并：重指别名 / 榜单 / 快照 / 价格到 keeper，删除其余实体，最后写回新 key。</p>
 *
 * <p>安全：整段在一个事务内；先给所有待改 key 的实体写唯一临时 key（{@code __rb_<id>}）腾空目标 key，
 * 再做合并删除，最后写回最终 key，规避唯一约束的瞬时冲突。支持 {@code dryRun} 预演。</p>
 */
@Service
public class ModelNormalizationRebuildService {

    private static final Log log = LogFactory.getLog(ModelNormalizationRebuildService.class);

    /** 结果里最多返回的明细条数 */
    private static final int MAX_CHANGES = 200;

    private final ModelEntityRepository entityRepository;
    private final ModelAliasRepository aliasRepository;
    private final ModelBenchmarkRepository benchmarkRepository;
    private final ModelBenchmarkSnapshotRepository snapshotRepository;
    private final ModelPricingRepository pricingRepository;
    private final ModelNormalizer normalizer;

    public ModelNormalizationRebuildService(ModelEntityRepository entityRepository,
                                            ModelAliasRepository aliasRepository,
                                            ModelBenchmarkRepository benchmarkRepository,
                                            ModelBenchmarkSnapshotRepository snapshotRepository,
                                            ModelPricingRepository pricingRepository,
                                            ModelNormalizer normalizer) {
        this.entityRepository = entityRepository;
        this.aliasRepository = aliasRepository;
        this.benchmarkRepository = benchmarkRepository;
        this.snapshotRepository = snapshotRepository;
        this.pricingRepository = pricingRepository;
        this.normalizer = normalizer;
    }

    @Transactional
    @CacheEvict(value = {"modelLeaderboard", "modelBenchmarks", "modelDetail", "modelVendors",
            "modelTrend", "leaderboardTrend", "hotSources"}, allEntries = true)
    public Map<String, Object> rebuild(boolean dryRun) {
        List<ModelEntity> all = entityRepository.findAll();

        Map<Long, Long> weightCache = new HashMap<>();
        ModelNormalizationPlanner.Plan plan = ModelNormalizationPlanner.plan(
                all,
                normalizer::canonicalKey,
                entity -> weightCache.computeIfAbsent(entity.getId(),
                        id -> (long) benchmarkRepository.findByModelId(id).size()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dryRun", dryRun);
        result.put("totalEntities", all.size());
        result.put("groupsMerged", plan.groupsMerged());
        result.put("entitiesRemoved", plan.entitiesRemoved());
        result.put("keysChanged", plan.keysChanged());
        result.put("changes", describe(plan));

        if (dryRun || (plan.groupsMerged() == 0 && plan.keysChanged() == 0)) {
            return result;
        }

        // 阶段 1：把所有待改 key 的实体写成唯一临时 key，腾空目标 key，规避唯一约束冲突
        for (ModelEntity e : all) {
            if (plan.newKeyByEntity().containsKey(e.getId())) {
                e.setCanonicalKey(tempKey(e.getId()));
                entityRepository.save(e);
            }
        }
        entityRepository.flush();

        // 阶段 2：逐组合并 loser → keeper，并删除 loser
        for (ModelNormalizationPlanner.Group group : plan.groups()) {
            mergeGroup(group);
        }
        entityRepository.flush();

        // 阶段 3：写回最终 key
        for (ModelNormalizationPlanner.Group group : plan.groups()) {
            ModelEntity keeper = group.keeper();
            keeper.setCanonicalKey(group.newKey());
            entityRepository.save(keeper);
        }
        entityRepository.flush();

        log.info("模型归一重建完成：合并组 " + plan.groupsMerged()
                + "，删除实体 " + plan.entitiesRemoved()
                + "，变更 key " + plan.keysChanged());
        return result;
    }

    private void mergeGroup(ModelNormalizationPlanner.Group group) {
        Long keeperId = group.keeper().getId();

        for (ModelEntity loser : group.losers()) {
            Long loserId = loser.getId();

            // 别名：全局唯一，直接重指不会冲突
            for (ModelAlias alias : aliasRepository.findByModelId(loserId)) {
                alias.setModelId(keeperId);
                aliasRepository.save(alias);
            }

            mergeBenchmarks(group.keeper(), loserId);
            mergeSnapshots(group.keeper(), loserId);
            mergePricing(group.keeper(), loserId);
            fillMissingMetadata(group.keeper(), loser);

            entityRepository.delete(loser);
        }
    }

    private void mergeBenchmarks(ModelEntity keeper, Long loserId) {
        Map<String, ModelBenchmark> keeperRows = indexBenchmarks(keeper.getId());
        for (ModelBenchmark row : benchmarkRepository.findByModelId(loserId)) {
            String key = row.getBenchmarkKey() + "\u0000" + row.getSourceKey();
            ModelBenchmark existing = keeperRows.get(key);
            if (existing == null) {
                row.setModelId(keeper.getId());
                row.setUpdatedAt(new Date());
                benchmarkRepository.save(row);
                keeperRows.put(key, row);
            } else {
                // 冲突：补空分值，否则保留 keeper 原值，删除 loser 行
                if (existing.getScore() == null && row.getScore() != null) {
                    existing.setScore(row.getScore());
                    existing.setRank(row.getRank());
                    existing.setSnapshotDate(row.getSnapshotDate());
                    existing.setUpdatedAt(new Date());
                    benchmarkRepository.save(existing);
                }
                benchmarkRepository.delete(row);
            }
        }
    }

    private void mergeSnapshots(ModelEntity keeper, Long loserId) {
        Map<String, ModelBenchmarkSnapshot> keeperRows = indexSnapshots(keeper.getId());
        for (ModelBenchmarkSnapshot row : snapshotRepository.findByModelId(loserId)) {
            String key = row.getBenchmarkKey() + "\u0000" + row.getSnapshotDate();
            if (!keeperRows.containsKey(key)) {
                row.setModelId(keeper.getId());
                snapshotRepository.save(row);
                keeperRows.put(key, row);
            } else {
                snapshotRepository.delete(row);
            }
        }
    }

    private void mergePricing(ModelEntity keeper, Long loserId) {
        Map<String, ModelPricing> keeperRows = indexPricing(keeper.getId());
        for (ModelPricing row : pricingRepository.findByModelId(loserId)) {
            ModelPricing existing = keeperRows.get(row.getSourceKey());
            if (existing == null) {
                row.setModelId(keeper.getId());
                row.setUpdatedAt(new Date());
                pricingRepository.save(row);
                keeperRows.put(row.getSourceKey(), row);
            } else {
                if (existing.getInputPrice() == null) {
                    existing.setInputPrice(row.getInputPrice());
                }
                if (existing.getOutputPrice() == null) {
                    existing.setOutputPrice(row.getOutputPrice());
                }
                if (existing.getContextWindow() == null) {
                    existing.setContextWindow(row.getContextWindow());
                }
                existing.setUpdatedAt(new Date());
                pricingRepository.save(existing);
                pricingRepository.delete(row);
            }
        }
    }

    private void fillMissingMetadata(ModelEntity keeper, ModelEntity loser) {
        if (keeper.getVendor() == null && loser.getVendor() != null) {
            keeper.setVendor(loser.getVendor());
        }
        if (keeper.getModality() == null && loser.getModality() != null) {
            keeper.setModality(loser.getModality());
        }
        if (keeper.getOpenWeights() == null && loser.getOpenWeights() != null) {
            keeper.setOpenWeights(loser.getOpenWeights());
        }
        if (keeper.getReleaseDate() == null && loser.getReleaseDate() != null) {
            keeper.setReleaseDate(loser.getReleaseDate());
        }
        if (keeper.getLinks() == null && loser.getLinks() != null) {
            keeper.setLinks(loser.getLinks());
        }
    }

    private Map<String, ModelBenchmark> indexBenchmarks(Long keeperId) {
        Map<String, ModelBenchmark> map = new HashMap<>();
        for (ModelBenchmark row : benchmarkRepository.findByModelId(keeperId)) {
            map.put(row.getBenchmarkKey() + "\u0000" + row.getSourceKey(), row);
        }
        return map;
    }

    private Map<String, ModelBenchmarkSnapshot> indexSnapshots(Long keeperId) {
        Map<String, ModelBenchmarkSnapshot> map = new HashMap<>();
        for (ModelBenchmarkSnapshot row : snapshotRepository.findByModelId(keeperId)) {
            map.put(row.getBenchmarkKey() + "\u0000" + row.getSnapshotDate(), row);
        }
        return map;
    }

    private Map<String, ModelPricing> indexPricing(Long keeperId) {
        Map<String, ModelPricing> map = new HashMap<>();
        for (ModelPricing row : pricingRepository.findByModelId(keeperId)) {
            map.put(row.getSourceKey(), row);
        }
        return map;
    }

    private List<Map<String, Object>> describe(ModelNormalizationPlanner.Plan plan) {
        List<Map<String, Object>> changes = new ArrayList<>();
        for (ModelNormalizationPlanner.Group group : plan.groups()) {
            if (changes.size() >= MAX_CHANGES) {
                break;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("newKey", group.newKey());
            item.put("keptFrom", group.keeper().getCanonicalKey());
            item.put("keptName", group.keeper().getDisplayName());
            List<String> removed = new ArrayList<>();
            for (ModelEntity loser : group.losers()) {
                removed.add(loser.getCanonicalKey() + " (" + loser.getDisplayName() + ")");
            }
            item.put("removed", removed);
            changes.add(item);
        }
        return changes;
    }

    private String tempKey(Long id) {
        return "__rb_" + id;
    }
}
