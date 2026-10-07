package com.example.blog.hot.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * ModelNormalizer 归一化规则单元测试（不依赖数据库）。
 */
class ModelNormalizerTest {

    private final ModelNormalizer normalizer = new ModelNormalizer(null, null);

    @Test
    @DisplayName("去掉括号限定词并加厂商前缀")
    void canonicalKey_stripsQualifiers() {
        assertEquals("openai:gpt-oss-20b", normalizer.canonicalKey("OpenAI", "gpt-oss-20B (high)"));
    }

    @Test
    @DisplayName("剥离名称中的厂商前缀，跨信源同名模型可合并")
    void canonicalKey_stripsVendorPrefix() {
        String fromAa = normalizer.canonicalKey("OpenAI", "GPT-5");
        String fromOpenRouter = normalizer.canonicalKey("openai", "openai/gpt-5");
        assertEquals(fromAa, fromOpenRouter);
        assertEquals("openai:gpt-5", fromAa);
    }

    @Test
    @DisplayName("MTEB 的 org/name 形式与厂商一致")
    void canonicalKey_mtebForm() {
        assertEquals("jcorners:ingot-8b-r3", normalizer.canonicalKey("jcorners", "jcorners/ingot-8b-r3"));
    }

    @Test
    @DisplayName("无厂商时仅用模型名 slug")
    void canonicalKey_withoutVendor() {
        assertEquals("some-model-v2", normalizer.canonicalKey(null, "Some Model v2"));
    }
}
