package com.example.blog.hot.model;

import com.example.blog.po.ModelEntity;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.ToLongFunction;

/**
 * 模型归一「重建」规划器（纯函数，不依赖数据库，便于单测）。
 *
 * <p>用**当前**归一规则重新计算每个实体的 canonical_key，把落到同一 key 的实体归为一组：
 * 每组保留一个 keeper，其余为 loser 待合并删除。用于修复「归一规则引入前建库、alias 优先命中
 * 导致旧 canonical_key 不重算」的历史重复实体。</p>
 *
 * <p>keeper 选择优先级：展示名更像人读（含空格 &gt; 含大写 &gt; 纯 slug）→ 数据更全（权重，
 * 通常为榜单行数）→ 本身就是目标 key → id 小。这样既保住信息量，也让展示名更友好。</p>
 */
public final class ModelNormalizationPlanner {

    private ModelNormalizationPlanner() {
    }

    /** 一组落在同一新 key 下、需要处理的实体。 */
    public static final class Group {
        private final String newKey;
        private final ModelEntity keeper;
        private final List<ModelEntity> members;
        private final List<ModelEntity> losers;

        Group(String newKey, ModelEntity keeper, List<ModelEntity> members, List<ModelEntity> losers) {
            this.newKey = newKey;
            this.keeper = keeper;
            this.members = members;
            this.losers = losers;
        }

        public String newKey() {
            return newKey;
        }

        public ModelEntity keeper() {
            return keeper;
        }

        public List<ModelEntity> members() {
            return members;
        }

        public List<ModelEntity> losers() {
            return losers;
        }
    }

    /** 规划结果。 */
    public static final class Plan {
        private final List<Group> groups;
        private final Map<Long, String> newKeyByEntity;

        Plan(List<Group> groups, Map<Long, String> newKeyByEntity) {
            this.groups = groups;
            this.newKeyByEntity = newKeyByEntity;
        }

        /** 需要执行的组（含「仅改 key」的单实体组）。 */
        public List<Group> groups() {
            return groups;
        }

        /** 每个实体按当前规则应得的新 canonical_key。 */
        public Map<Long, String> newKeyByEntity() {
            return newKeyByEntity;
        }

        /** 需要变更 canonical_key 的实体数。 */
        public int keysChanged() {
            return newKeyByEntity.size();
        }

        /** 将被合并删除的实体数。 */
        public int entitiesRemoved() {
            return groups.stream().mapToInt(g -> g.losers().size()).sum();
        }

        /** 实际发生合并（loser &gt; 0）的组数。 */
        public int groupsMerged() {
            return (int) groups.stream().filter(g -> !g.losers().isEmpty()).count();
        }
    }

    /**
     * @param entities 全部实体
     * @param keyFn    (vendor, displayName) → 新 canonical_key
     * @param weightFn 实体权重（越大越优先保留），通常取榜单行数
     */
    public static Plan plan(List<ModelEntity> entities,
                            BiFunction<String, String, String> keyFn,
                            ToLongFunction<ModelEntity> weightFn) {
        Map<String, List<ModelEntity>> grouped = new LinkedHashMap<>();
        Map<Long, String> newKeyByEntity = new LinkedHashMap<>();
        Map<Long, String> oldKeyByEntity = new LinkedHashMap<>();

        for (ModelEntity e : entities) {
            String key = keyFn.apply(e.getVendor(), e.getDisplayName());
            if (key == null || key.isBlank()) {
                key = e.getCanonicalKey();
            }
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(e);
            newKeyByEntity.put(e.getId(), key);
            oldKeyByEntity.put(e.getId(), e.getCanonicalKey());
        }

        List<Group> actionable = new ArrayList<>();
        for (Map.Entry<String, List<ModelEntity>> entry : grouped.entrySet()) {
            String newKey = entry.getKey();
            List<ModelEntity> members = entry.getValue();

            boolean requiresKeyChange = members.stream()
                    .anyMatch(m -> !newKey.equals(oldKeyByEntity.get(m.getId())));
            if (members.size() == 1 && !requiresKeyChange) {
                continue;
            }

            List<ModelEntity> sorted = new ArrayList<>(members);
            sorted.sort(keeperComparator(newKey, weightFn));
            ModelEntity keeper = sorted.get(0);
            List<ModelEntity> losers = new ArrayList<>();
            for (ModelEntity m : sorted) {
                if (!m.getId().equals(keeper.getId())) {
                    losers.add(m);
                }
            }
            actionable.add(new Group(newKey, keeper, members, losers));
        }

        // 只保留需要变更 key 的实体
        Map<Long, String> changed = new LinkedHashMap<>();
        for (Map.Entry<Long, String> e : newKeyByEntity.entrySet()) {
            if (!e.getValue().equals(oldKeyByEntity.get(e.getKey()))) {
                changed.put(e.getKey(), e.getValue());
            }
        }
        return new Plan(actionable, changed);
    }

    private static Comparator<ModelEntity> keeperComparator(String newKey, ToLongFunction<ModelEntity> weightFn) {
        return Comparator
                .comparingInt(ModelNormalizationPlanner::readableScore).reversed()
                .thenComparing(Comparator.comparingLong(weightFn::applyAsLong).reversed())
                .thenComparingInt(e -> newKey.equals(e.getCanonicalKey()) ? 0 : 1)
                .thenComparingLong(e -> e.getId() == null ? Long.MAX_VALUE : e.getId());
    }

    /** 展示名可读性：含空格 2 &gt; 含大写 1 &gt; 纯小写 slug 0。 */
    static int readableScore(ModelEntity e) {
        String name = e.getDisplayName();
        if (name == null || name.isBlank()) {
            return 0;
        }
        if (name.contains(" ")) {
            return 2;
        }
        for (int i = 0; i < name.length(); i++) {
            if (Character.isUpperCase(name.charAt(i))) {
                return 1;
            }
        }
        return 0;
    }
}
