package com.example.blog.hot.model;

import com.example.blog.po.ModelEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 模型归一重建规划器单元测试（纯函数，不依赖数据库）。
 */
class ModelNormalizationPlannerTest {

    private final ModelNormalizer normalizer = new ModelNormalizer(null, null, new VendorRegistry());

    private ModelEntity entity(long id, String canonicalKey, String vendor, String displayName) {
        ModelEntity e = new ModelEntity();
        e.setId(id);
        e.setCanonicalKey(canonicalKey);
        e.setVendor(vendor);
        e.setDisplayName(displayName);
        return e;
    }

    @Test
    @DisplayName("跨源旧 key 合并：spacexai:grok-4-7 并入 xai:grok-4-7，保留可读展示名")
    void plan_mergesStaleVendorKey() {
        List<ModelEntity> all = List.of(
                entity(89, "spacexai:grok-4-7", "xai", "Grok 4.7 (Low)"),
                entity(1307, "xai:grok-4-7", "xAI", "grok-4-7"));

        ModelNormalizationPlanner.Plan plan =
                ModelNormalizationPlanner.plan(all, normalizer::canonicalKey, e -> 1);

        assertEquals(1, plan.groupsMerged());
        assertEquals(1, plan.entitiesRemoved());
        ModelNormalizationPlanner.Group group = plan.groups().get(0);
        assertEquals("xai:grok-4-7", group.newKey());
        assertEquals(89L, group.keeper().getId(), "含空格的展示名应被优先保留");
        assertEquals(1307L, group.losers().get(0).getId());
    }

    @Test
    @DisplayName("仅 key 过期（无重复）时也需重算")
    void plan_changesStaleKeyOnly() {
        List<ModelEntity> all = List.of(
                entity(1, "old:name", "Anthropic", "Claude Opus 4.5"));

        ModelNormalizationPlanner.Plan plan =
                ModelNormalizationPlanner.plan(all, normalizer::canonicalKey, e -> 0);

        assertEquals(0, plan.groupsMerged());
        assertEquals(0, plan.entitiesRemoved());
        assertEquals(1, plan.keysChanged());
        assertEquals(1, plan.groups().size());
        assertEquals("anthropic:claude-opus-4-5", plan.groups().get(0).newKey());
    }

    @Test
    @DisplayName("已一致时无任何变更")
    void plan_noopWhenAlreadyNormalized() {
        List<ModelEntity> all = List.of(
                entity(1, "anthropic:claude-opus-4-5", "Anthropic", "Claude Opus 4.5"));

        ModelNormalizationPlanner.Plan plan =
                ModelNormalizationPlanner.plan(all, normalizer::canonicalKey, e -> 5);

        assertTrue(plan.groups().isEmpty());
        assertEquals(0, plan.keysChanged());
    }

    @Test
    @DisplayName("同为 slug 名时按数据量（权重）选 keeper")
    void plan_keeperPrefersWeightWhenNamesTie() {
        List<ModelEntity> all = new ArrayList<>();
        all.add(entity(1, "xai:grok-4-7-a", "xai", "grok-4-7"));
        all.add(entity(2, "xai:grok-4-7-b", "xAI", "grok-4-7"));

        ModelNormalizationPlanner.Plan plan =
                ModelNormalizationPlanner.plan(all, normalizer::canonicalKey, e -> e.getId() == 2 ? 9 : 1);

        assertEquals(2L, plan.groups().get(0).keeper().getId());
    }
}
