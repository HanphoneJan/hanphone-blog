package com.example.blog.service.impl;

import com.example.blog.dao.BenchmarkMetaRepository;
import com.example.blog.dao.ModelBenchmarkRepository;
import com.example.blog.dao.ModelBenchmarkSnapshotRepository;
import com.example.blog.dao.ModelEntityRepository;
import com.example.blog.dao.ModelPricingRepository;
import com.example.blog.hot.model.BenchmarkMetaData;
import com.example.blog.hot.model.BenchmarkRegistry;
import com.example.blog.hot.model.VendorRegistry;
import com.example.blog.po.BenchmarkMeta;
import com.example.blog.po.ModelBenchmark;
import com.example.blog.po.ModelBenchmarkSnapshot;
import com.example.blog.po.ModelEntity;
import com.example.blog.po.ModelPricing;
import com.example.blog.service.ModelQueryService;
import com.example.blog.vo.BenchmarkMetaVO;
import com.example.blog.vo.LeaderboardTrendVO;
import com.example.blog.vo.ModelBenchmarkRowVO;
import com.example.blog.vo.ModelCompareVO;
import com.example.blog.vo.ModelLeaderboardVO;
import com.example.blog.vo.ModelTrendVO;
import com.example.blog.vo.TrendPointVO;
import com.example.blog.vo.TrendSeriesVO;
import com.example.blog.vo.VendorVO;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ModelQueryServiceImpl implements ModelQueryService {

    private static final List<String> MODALITIES =
            List.of("text", "coding", "agent", "embedding", "image", "video", "speech");
    private static final int MAX_ROWS = 50;
    private static final int MAX_LIST = 100;
    private static final int MAX_COMPARE = 8;

    private final ModelEntityRepository entityRepository;
    private final ModelBenchmarkRepository benchmarkRepository;
    private final ModelBenchmarkSnapshotRepository snapshotRepository;
    private final ModelPricingRepository pricingRepository;
    private final BenchmarkMetaRepository benchmarkMetaRepository;
    private final BenchmarkRegistry benchmarkRegistry;
    private final VendorRegistry vendorRegistry;

    public ModelQueryServiceImpl(ModelEntityRepository entityRepository,
                                 ModelBenchmarkRepository benchmarkRepository,
                                 ModelBenchmarkSnapshotRepository snapshotRepository,
                                 ModelPricingRepository pricingRepository,
                                 BenchmarkMetaRepository benchmarkMetaRepository,
                                 BenchmarkRegistry benchmarkRegistry,
                                 VendorRegistry vendorRegistry) {
        this.entityRepository = entityRepository;
        this.benchmarkRepository = benchmarkRepository;
        this.snapshotRepository = snapshotRepository;
        this.pricingRepository = pricingRepository;
        this.benchmarkMetaRepository = benchmarkMetaRepository;
        this.benchmarkRegistry = benchmarkRegistry;
        this.vendorRegistry = vendorRegistry;
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
    @Cacheable("modelVendors")
    public List<VendorVO> getVendors() {
        // key → (原始写法 → 出现次数)；未知厂商取出现次数最多的写法作为展示名
        Map<String, Map<String, Integer>> variants = new LinkedHashMap<>();
        for (ModelEntity model : entityRepository.findAll()) {
            String key = vendorRegistry.key(model.getVendor());
            if (key == null) {
                continue;
            }
            variants.computeIfAbsent(key, k -> new LinkedHashMap<>())
                    .merge(model.getVendor().trim(), 1, Integer::sum);
        }
        List<VendorVO> list = new ArrayList<>();
        variants.forEach((key, raws) -> {
            String label = vendorRegistry.label(key);
            if (label == null) {
                label = raws.entrySet().stream()
                        .max(Comparator.<Map.Entry<String, Integer>>comparingInt(Map.Entry::getValue)
                                .thenComparing(Map.Entry::getKey, Comparator.reverseOrder()))
                        .map(Map.Entry::getKey)
                        .orElse(key);
            }
            VendorVO vo = new VendorVO();
            vo.setKey(label);
            vo.setLabel(label);
            vo.setModelCount(raws.values().stream().mapToInt(Integer::intValue).sum());
            vo.setFocused(vendorRegistry.isFocused(key));
            vo.setPriority(vendorRegistry.focusRank(key));
            list.add(vo);
        });
        list.sort(Comparator
                .comparingInt(VendorVO::getPriority)
                .thenComparing(VendorVO::getModelCount, Comparator.reverseOrder())
                .thenComparing(VendorVO::getLabel, String.CASE_INSENSITIVE_ORDER));
        return list;
    }

    @Override
    public List<ModelBenchmarkRowVO> listModels(String query, String vendor, String sort, int limit) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String vendorKey = (vendor == null || vendor.isBlank()) ? null : vendorRegistry.key(vendor);
        int size = Math.max(1, Math.min(limit, MAX_LIST));

        List<ModelEntity> filtered = new ArrayList<>();
        for (ModelEntity model : entityRepository.findAll()) {
            String key = vendorRegistry.key(model.getVendor());
            if (vendorKey != null && !vendorKey.equals(key)) {
                continue;
            }
            if (!q.isEmpty()) {
                String name = model.getDisplayName() == null ? "" : model.getDisplayName().toLowerCase(Locale.ROOT);
                String keyLower = key == null ? "" : key;
                String rawLower = model.getVendor() == null ? "" : model.getVendor().toLowerCase(Locale.ROOT);
                String label = vendorRegistry.label(key);
                String labelLower = label == null ? "" : label.toLowerCase(Locale.ROOT);
                if (!name.contains(q) && !keyLower.contains(q) && !rawLower.contains(q) && !labelLower.contains(q)) {
                    continue;
                }
            }
            filtered.add(model);
        }

        Map<Long, List<ModelPricing>> pricingByModel = filtered.isEmpty() ? Map.of()
                : pricingRepository.findByModelIdIn(filtered.stream().map(ModelEntity::getId).collect(Collectors.toList()))
                .stream().collect(Collectors.groupingBy(ModelPricing::getModelId));

        List<ModelBenchmarkRowVO> rows = new ArrayList<>();
        for (ModelEntity model : filtered) {
            rows.add(toRow(model, List.of(), mergePricing(pricingByModel.get(model.getId())), null));
        }
        rows.sort(modelComparator(sort));
        return rows.size() > size ? new ArrayList<>(rows.subList(0, size)) : rows;
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

    /** 模型列表排序：newest（默认）/ name / price / context */
    private Comparator<ModelBenchmarkRowVO> modelComparator(String sort) {
        Comparator<ModelBenchmarkRowVO> byName = Comparator.comparing(
                (ModelBenchmarkRowVO r) -> r.getDisplayName() == null ? "" : r.getDisplayName(),
                String.CASE_INSENSITIVE_ORDER);
        String key = sort == null ? "newest" : sort.trim().toLowerCase(Locale.ROOT);
        return switch (key) {
            case "name" -> byName;
            case "price" -> Comparator
                    .comparingDouble((ModelBenchmarkRowVO r) -> r.getInputPrice() == null ? Double.MAX_VALUE : r.getInputPrice())
                    .thenComparingDouble(r -> r.getOutputPrice() == null ? Double.MAX_VALUE : r.getOutputPrice())
                    .thenComparing(byName);
            case "context" -> Comparator
                    .comparingInt((ModelBenchmarkRowVO r) -> r.getContextWindow() == null ? -1 : r.getContextWindow())
                    .reversed()
                    .thenComparing(byName);
            default -> Comparator
                    .comparing((ModelBenchmarkRowVO r) -> r.getReleaseDate(),
                            Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(byName);
        };
    }

    private ModelBenchmarkRowVO toRow(ModelEntity model, List<ModelBenchmark> benchmarks,
                                      ModelPricing pricing, String primary) {
        ModelBenchmarkRowVO row = new ModelBenchmarkRowVO();
        row.setModelKey(model.getCanonicalKey());
        row.setDisplayName(model.getDisplayName());
        String vendorKey = vendorRegistry.key(model.getVendor());
        String vendorLabel = vendorRegistry.label(vendorKey);
        row.setVendor(vendorLabel != null ? vendorLabel : model.getVendor());
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
