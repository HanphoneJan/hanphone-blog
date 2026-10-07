package com.example.blog.service.impl;

import com.example.blog.dao.BenchmarkMetaRepository;
import com.example.blog.dao.ModelBenchmarkRepository;
import com.example.blog.dao.ModelBenchmarkSnapshotRepository;
import com.example.blog.dao.ModelEntityRepository;
import com.example.blog.dao.ModelPricingRepository;
import com.example.blog.hot.model.BenchmarkMetaData;
import com.example.blog.hot.model.BenchmarkRegistry;
import com.example.blog.hot.model.FeaturedModelRegistry;
import com.example.blog.po.BenchmarkMeta;
import com.example.blog.po.ModelBenchmark;
import com.example.blog.po.ModelBenchmarkSnapshot;
import com.example.blog.po.ModelEntity;
import com.example.blog.po.ModelPricing;
import com.example.blog.service.ModelQueryService;
import com.example.blog.vo.BenchmarkMetaVO;
import com.example.blog.vo.FeaturedGroupVO;
import com.example.blog.vo.FeaturedModelVO;
import com.example.blog.vo.LeaderboardTrendVO;
import com.example.blog.vo.ModelBenchmarkRowVO;
import com.example.blog.vo.ModelCompareVO;
import com.example.blog.vo.ModelLeaderboardVO;
import com.example.blog.vo.ModelTrendVO;
import com.example.blog.vo.TrendPointVO;
import com.example.blog.vo.TrendSeriesVO;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ModelQueryServiceImpl implements ModelQueryService {

    private static final List<String> MODALITIES =
            List.of("text", "coding", "agent", "embedding", "image", "video", "speech");
    private static final int MAX_ROWS = 50;
    private static final int MAX_SEARCH = 30;
    private static final int MAX_COMPARE = 8;

    private final ModelEntityRepository entityRepository;
    private final ModelBenchmarkRepository benchmarkRepository;
    private final ModelBenchmarkSnapshotRepository snapshotRepository;
    private final ModelPricingRepository pricingRepository;
    private final BenchmarkMetaRepository benchmarkMetaRepository;
    private final BenchmarkRegistry benchmarkRegistry;
    private final FeaturedModelRegistry featuredModelRegistry;

    public ModelQueryServiceImpl(ModelEntityRepository entityRepository,
                                 ModelBenchmarkRepository benchmarkRepository,
                                 ModelBenchmarkSnapshotRepository snapshotRepository,
                                 ModelPricingRepository pricingRepository,
                                 BenchmarkMetaRepository benchmarkMetaRepository,
                                 BenchmarkRegistry benchmarkRegistry,
                                 FeaturedModelRegistry featuredModelRegistry) {
        this.entityRepository = entityRepository;
        this.benchmarkRepository = benchmarkRepository;
        this.snapshotRepository = snapshotRepository;
        this.pricingRepository = pricingRepository;
        this.benchmarkMetaRepository = benchmarkMetaRepository;
        this.benchmarkRegistry = benchmarkRegistry;
        this.featuredModelRegistry = featuredModelRegistry;
    }

    @Override
    @Cacheable(value = "modelLeaderboard", key = "T(java.util.Objects).toString(#modality, 'text')")
    public ModelLeaderboardVO getLeaderboard(String modality) {
        String mod = normalizeModality(modality);
        ModelLeaderboardVO vo = new ModelLeaderboardVO();
        vo.setModality(mod);
        vo.setLabel(label(mod));

        List<BenchmarkMeta> metas = benchmarkMetaRepository.findByCategoryOrderByBenchmarkKeyAsc(mod);
        vo.setBenchmarks(metas.stream().map(this::toMetaVO).collect(Collectors.toList()));
        if (metas.isEmpty()) {
            return vo;
        }
        List<String> keys = metas.stream().map(BenchmarkMeta::getBenchmarkKey).collect(Collectors.toList());

        Map<Long, List<ModelBenchmark>> byModel = benchmarkRepository.findByBenchmarkKeyIn(keys).stream()
                .collect(Collectors.groupingBy(ModelBenchmark::getModelId));
        if (byModel.isEmpty()) {
            return vo;
        }
        List<Long> modelIds = new ArrayList<>(byModel.keySet());
        Map<Long, ModelEntity> models = entityRepository.findByIdIn(modelIds).stream()
                .collect(Collectors.toMap(ModelEntity::getId, e -> e));
        Map<Long, List<ModelPricing>> pricingByModel = pricingRepository.findByModelIdIn(modelIds).stream()
                .collect(Collectors.groupingBy(ModelPricing::getModelId));

        String primary = benchmarkRegistry.primaryKey(mod);
        Map<Long, Integer> prevRank = previousRanks(modelIds, primary);
        List<ModelBenchmarkRowVO> rows = new ArrayList<>();
        for (Map.Entry<Long, List<ModelBenchmark>> entry : byModel.entrySet()) {
            ModelEntity model = models.get(entry.getKey());
            if (model == null) {
                continue;
            }
            ModelBenchmarkRowVO row = toRow(model, entry.getValue(),
                    mergePricing(pricingByModel.get(entry.getKey())), primary);
            if (row.getRank() != null && prevRank.containsKey(entry.getKey())) {
                row.setRankChange(prevRank.get(entry.getKey()) - row.getRank());
            }
            rows.add(row);
        }
        rows.sort(Comparator.comparingDouble((ModelBenchmarkRowVO r) -> primaryScore(r, primary)).reversed());
        if (rows.size() > MAX_ROWS) {
            rows = new ArrayList<>(rows.subList(0, MAX_ROWS));
        }
        vo.setRows(rows);
        return vo;
    }

    @Override
    @Cacheable("modelBenchmarks")
    public List<BenchmarkMetaVO> getBenchmarks() {
        return benchmarkMetaRepository.findAll().stream()
                .map(this::toMetaVO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ModelBenchmarkRowVO> searchModels(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        int size = Math.max(1, Math.min(limit, MAX_SEARCH));
        List<ModelEntity> models = entityRepository
                .findByDisplayNameContainingIgnoreCaseOrVendorContainingIgnoreCase(
                        query.trim(), query.trim(), PageRequest.of(0, size));
        List<ModelBenchmarkRowVO> rows = new ArrayList<>();
        for (ModelEntity model : models) {
            rows.add(toRow(model, benchmarkRepository.findByModelId(model.getId()),
                    mergePricing(pricingRepository.findByModelId(model.getId())), null));
        }
        return rows;
    }

    @Override
    @Cacheable(value = "modelDetail", key = "#canonicalKey")
    public ModelBenchmarkRowVO getModel(String canonicalKey) {
        ModelEntity model = entityRepository.findByCanonicalKey(canonicalKey).orElse(null);
        if (model == null) {
            return null;
        }
        return toRow(model, benchmarkRepository.findByModelId(model.getId()),
                mergePricing(pricingRepository.findByModelId(model.getId())), null);
    }

    @Override
    @Cacheable("modelFeatured")
    public List<FeaturedGroupVO> getFeatured() {
        List<FeaturedGroupVO> groups = new ArrayList<>();
        for (FeaturedModelRegistry.FeaturedGroup group : featuredModelRegistry.groups()) {
            FeaturedGroupVO vo = new FeaturedGroupVO();
            vo.setKey(group.key());
            vo.setLabel(group.label());
            vo.setModality(group.modality());
            Set<String> seen = new HashSet<>();
            for (FeaturedModelRegistry.FeaturedEntry entry : group.entries()) {
                ModelEntity model = resolveFeatured(entry.keywords(), group.modality());
                if (model == null || !seen.add(model.getCanonicalKey())) {
                    continue;
                }
                FeaturedModelVO fm = new FeaturedModelVO();
                fm.setModelKey(model.getCanonicalKey());
                fm.setDisplayName(model.getDisplayName());
                fm.setVendor(model.getVendor());
                fm.setModality(model.getModality());
                vo.getModels().add(fm);
            }
            if (!vo.getModels().isEmpty()) {
                groups.add(vo);
            }
        }
        return groups;
    }

    @Override
    public ModelCompareVO compare(List<String> modelKeys) {
        ModelCompareVO vo = new ModelCompareVO();
        if (modelKeys == null || modelKeys.isEmpty()) {
            return vo;
        }
        List<ModelEntity> models = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String key : modelKeys) {
            if (key == null || key.isBlank() || models.size() >= MAX_COMPARE) {
                continue;
            }
            entityRepository.findByCanonicalKey(key.trim()).ifPresent(model -> {
                if (seen.add(model.getCanonicalKey())) {
                    models.add(model);
                }
            });
        }
        if (models.isEmpty()) {
            return vo;
        }

        Map<String, BenchmarkMeta> metaByKey = benchmarkMetaRepository.findAll().stream()
                .collect(Collectors.toMap(BenchmarkMeta::getBenchmarkKey, m -> m, (a, b) -> a));

        LinkedHashSet<String> keys = new LinkedHashSet<>();
        // 先按注册表顺序排列已知榜单
        for (BenchmarkMetaData def : benchmarkRegistry.all()) {
            if (metaByKey.containsKey(def.key())) {
                keys.add(def.key());
            }
        }

        for (ModelEntity model : models) {
            List<ModelBenchmark> benchmarks = benchmarkRepository.findByModelId(model.getId());
            for (ModelBenchmark b : benchmarks) {
                if (b.getScore() != null) {
                    keys.add(b.getBenchmarkKey());
                }
            }
            vo.getModels().add(toRow(model, benchmarks,
                    mergePricing(pricingRepository.findByModelId(model.getId())), null));
        }

        for (String key : keys) {
            BenchmarkMeta meta = metaByKey.get(key);
            if (meta != null) {
                vo.getBenchmarks().add(toMetaVO(meta));
            }
        }
        return vo;
    }

    @Override
    @Cacheable(value = "modelTrend", key = "#canonicalKey + ':' + #days")
    public ModelTrendVO getModelTrend(String canonicalKey, int days) {
        ModelEntity model = entityRepository.findByCanonicalKey(canonicalKey).orElse(null);
        if (model == null) {
            return null;
        }
        int d = clampDays(days);
        LocalDate since = LocalDate.now().minusDays(d);

        Map<String, BenchmarkMeta> metaByKey = benchmarkMetaRepository.findAll().stream()
                .collect(Collectors.toMap(BenchmarkMeta::getBenchmarkKey, m -> m, (a, b) -> a));

        Map<String, List<TrendPointVO>> byKey = new LinkedHashMap<>();
        for (ModelBenchmarkSnapshot snap : snapshotRepository
                .findByModelIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(model.getId(), since)) {
            byKey.computeIfAbsent(snap.getBenchmarkKey(), k -> new ArrayList<>())
                    .add(new TrendPointVO(snap.getSnapshotDate().toString(), snap.getScore(), snap.getRank()));
        }

        ModelTrendVO vo = new ModelTrendVO();
        vo.setModelKey(model.getCanonicalKey());
        vo.setDisplayName(model.getDisplayName());
        for (BenchmarkMetaData def : benchmarkRegistry.all()) {
            if (byKey.containsKey(def.key())) {
                vo.getSeries().add(buildSeries(def.key(), metaByKey.get(def.key()), byKey.get(def.key())));
            }
        }
        for (Map.Entry<String, List<TrendPointVO>> e : byKey.entrySet()) {
            if (benchmarkRegistry.get(e.getKey()).isEmpty()) {
                vo.getSeries().add(buildSeries(e.getKey(), metaByKey.get(e.getKey()), e.getValue()));
            }
        }
        return vo;
    }

    @Override
    @Cacheable(value = "leaderboardTrend", key = "#modality + ':' + #days + ':' + #top")
    public LeaderboardTrendVO getLeaderboardTrend(String modality, int days, int top) {
        String mod = normalizeModality(modality);
        LeaderboardTrendVO vo = new LeaderboardTrendVO();
        vo.setModality(mod);

        String primary = benchmarkRegistry.primaryKey(mod);
        if (primary == null) {
            return vo;
        }
        BenchmarkMeta meta = benchmarkMetaRepository.findByBenchmarkKey(primary).orElse(null);
        vo.setBenchmarkKey(primary);
        vo.setBenchmarkName(meta != null ? meta.getName() : primary);
        vo.setUnit(meta != null ? meta.getUnit() : null);

        List<ModelBenchmark> rows = new ArrayList<>(benchmarkRepository.findByBenchmarkKeyIn(List.of(primary)));
        rows.sort(Comparator.comparingDouble(
                (ModelBenchmark b) -> b.getScore() == null ? Double.NEGATIVE_INFINITY : b.getScore()).reversed());
        int limit = Math.max(1, Math.min(top, 10));
        rows = rows.stream().limit(limit).collect(Collectors.toList());
        if (rows.isEmpty()) {
            return vo;
        }
        List<Long> ids = rows.stream().map(ModelBenchmark::getModelId).collect(Collectors.toList());
        Map<Long, ModelEntity> models = entityRepository.findByIdIn(ids).stream()
                .collect(Collectors.toMap(ModelEntity::getId, e -> e));

        LocalDate since = LocalDate.now().minusDays(clampDays(days));
        Map<Long, List<TrendPointVO>> byModel = new LinkedHashMap<>();
        for (ModelBenchmarkSnapshot snap : snapshotRepository
                .findByModelIdInAndBenchmarkKeyAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(ids, primary, since)) {
            byModel.computeIfAbsent(snap.getModelId(), k -> new ArrayList<>())
                    .add(new TrendPointVO(snap.getSnapshotDate().toString(), snap.getScore(), snap.getRank()));
        }

        for (ModelBenchmark row : rows) {
            ModelEntity model = models.get(row.getModelId());
            List<TrendPointVO> points = byModel.get(row.getModelId());
            if (model == null || points == null || points.isEmpty()) {
                continue;
            }
            TrendSeriesVO series = new TrendSeriesVO();
            series.setKey(model.getCanonicalKey());
            series.setLabel(model.getDisplayName());
            series.setUnit(meta != null ? meta.getUnit() : null);
            series.setPoints(points);
            vo.getSeries().add(series);
        }
        return vo;
    }

    private TrendSeriesVO buildSeries(String key, BenchmarkMeta meta, List<TrendPointVO> points) {
        TrendSeriesVO series = new TrendSeriesVO();
        series.setKey(key);
        series.setLabel(meta != null ? meta.getName() : key);
        series.setUnit(meta != null ? meta.getUnit() : null);
        series.setPoints(points);
        return series;
    }

    private int clampDays(int days) {
        return Math.max(7, Math.min(days, 180));
    }

    /** 每个模型在主榜上「今天之前」最近一次快照的排名（用于计算排名变化） */
    private Map<Long, Integer> previousRanks(List<Long> modelIds, String primary) {
        Map<Long, Integer> prev = new java.util.HashMap<>();
        if (primary == null || modelIds.isEmpty()) {
            return prev;
        }
        LocalDate today = LocalDate.now();
        LocalDate since = today.minusDays(35);
        for (ModelBenchmarkSnapshot s : snapshotRepository
                .findByModelIdInAndBenchmarkKeyAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(
                        modelIds, primary, since)) {
            if (s.getRank() == null || !s.getSnapshotDate().isBefore(today)) {
                continue;
            }
            prev.put(s.getModelId(), s.getRank());
        }
        return prev;
    }

    private ModelEntity resolveFeatured(List<String> keywords, String modality) {
        if (keywords == null) {
            return null;
        }
        for (String keyword : keywords) {
            List<ModelEntity> candidates = entityRepository
                    .findByDisplayNameContainingIgnoreCaseOrVendorContainingIgnoreCase(
                            keyword, keyword, PageRequest.of(0, 100));
            if (candidates.isEmpty()) {
                continue;
            }
            List<ModelEntity> matched = candidates.stream()
                    .filter(m -> modality.equalsIgnoreCase(m.getModality() == null ? "" : m.getModality()))
                    .collect(Collectors.toList());
            List<ModelEntity> pool = matched.isEmpty() ? candidates : matched;
            // 按发布时间取较新的前 30 个作为候选池，再按榜单排名挑最优代表
            pool = pool.stream()
                    .sorted(Comparator
                            .comparing(ModelEntity::getReleaseDate,
                                    Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(ModelEntity::getDisplayName,
                                    Comparator.nullsLast(String::compareToIgnoreCase)))
                    .limit(30)
                    .collect(Collectors.toList());

            List<Long> ids = pool.stream().map(ModelEntity::getId).collect(Collectors.toList());
            Map<Long, Integer> bestRank = new java.util.HashMap<>();
            for (ModelBenchmark b : benchmarkRepository.findByModelIdIn(ids)) {
                if (b.getRank() != null) {
                    bestRank.merge(b.getModelId(), b.getRank(), Math::min);
                }
            }
            return pool.stream()
                    .sorted(Comparator
                            .comparingInt((ModelEntity m) -> bestRank.getOrDefault(m.getId(), Integer.MAX_VALUE))
                            .thenComparing(ModelEntity::getReleaseDate,
                                    Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(ModelEntity::getDisplayName,
                                    Comparator.nullsLast(String::compareToIgnoreCase)))
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private ModelBenchmarkRowVO toRow(ModelEntity model, List<ModelBenchmark> benchmarks,
                                      ModelPricing pricing, String primary) {
        ModelBenchmarkRowVO row = new ModelBenchmarkRowVO();
        row.setModelKey(model.getCanonicalKey());
        row.setDisplayName(model.getDisplayName());
        row.setVendor(model.getVendor());
        row.setModality(model.getModality());
        row.setOpenWeights(model.getOpenWeights());
        row.setReleaseDate(model.getReleaseDate());
        row.setLink(model.getLinks());
        for (ModelBenchmark b : benchmarks) {
            if (b.getScore() != null) {
                row.getScores().put(b.getBenchmarkKey(), b.getScore());
            }
            if (primary != null && primary.equals(b.getBenchmarkKey())) {
                row.setRank(b.getRank());
            }
        }
        if (pricing != null) {
            row.setInputPrice(pricing.getInputPrice());
            row.setOutputPrice(pricing.getOutputPrice());
            row.setContextWindow(pricing.getContextWindow());
        }
        return row;
    }

    /** 合并同一模型多个来源的价格/上下文（不同源字段互补） */
    private ModelPricing mergePricing(List<ModelPricing> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        ModelPricing merged = new ModelPricing();
        for (ModelPricing p : list) {
            if (merged.getInputPrice() == null && p.getInputPrice() != null) {
                merged.setInputPrice(p.getInputPrice());
            }
            if (merged.getOutputPrice() == null && p.getOutputPrice() != null) {
                merged.setOutputPrice(p.getOutputPrice());
            }
            if (merged.getContextWindow() == null && p.getContextWindow() != null) {
                merged.setContextWindow(p.getContextWindow());
            }
        }
        if (merged.getInputPrice() == null && merged.getOutputPrice() == null
                && merged.getContextWindow() == null) {
            return null;
        }
        return merged;
    }

    private double primaryScore(ModelBenchmarkRowVO row, String primary) {
        if (primary == null) {
            return 0;
        }
        Double score = row.getScores().get(primary);
        return score == null ? Double.NEGATIVE_INFINITY : score;
    }

    private BenchmarkMetaVO toMetaVO(BenchmarkMeta meta) {
        BenchmarkMetaVO vo = new BenchmarkMetaVO();
        vo.setKey(meta.getBenchmarkKey());
        vo.setName(meta.getName());
        vo.setCategory(meta.getCategory());
        vo.setUnit(meta.getUnit());
        vo.setHigherIsBetter(meta.isHigherIsBetter());
        vo.setSourceKey(meta.getSourceKey());
        return vo;
    }

    private String normalizeModality(String modality) {
        if (modality == null || modality.isBlank()) {
            return "text";
        }
        String mod = modality.trim().toLowerCase();
        return MODALITIES.contains(mod) ? mod : "text";
    }

    private String label(String modality) {
        return switch (modality) {
            case "text" -> "文本模型";
            case "coding" -> "代码 / Agent";
            case "agent" -> "智能体";
            case "embedding" -> "Embedding 模型";
            case "image" -> "图像生成";
            case "video" -> "视频生成";
            case "speech" -> "语音";
            default -> modality;
        };
    }
}
