package com.example.blog.hot.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * ModelNormalizer 归一化规则单元测试（不依赖数据库）。
 */
class ModelNormalizerTest {

    private final ModelNormalizer normalizer = new ModelNormalizer(null, null, new VendorRegistry());

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

    @Test
    @DisplayName("去掉变体后缀：LMArena 的 -high 与 AA 的 (Xhigh) 归为同一模型")
    void canonicalKey_stripsVariantSuffix() {
        String fromLmArena = normalizer.canonicalKey("anthropic", "claude-opus-5-high");
        String fromAa = normalizer.canonicalKey("Anthropic", "Claude Opus 5 (Xhigh)");
        assertEquals(fromAa, fromLmArena);
        assertEquals("anthropic:claude-opus-5", fromAa);
    }

    @Test
    @DisplayName("厂商也归一：moonshot/Kimi、zai/z-ai 合并")
    void canonicalKey_normalizesVendor() {
        assertEquals(normalizer.canonicalKey("Kimi", "Kimi K3"),
                normalizer.canonicalKey("moonshot", "kimi-k3"));
        assertEquals(normalizer.canonicalKey("Z.ai", "GLM-5.3"),
                normalizer.canonicalKey("zai", "glm-5.3"));
    }

    @Test
    @DisplayName("不剥离真实模型名中的 max/medium/standard/thinking/reasoning")
    void canonicalKey_keepsRealModelNameTokens() {
        assertEquals("alibaba:qwen3-max", normalizer.canonicalKey("Alibaba", "qwen3-max"));
        assertEquals("alibaba:qwen3-max-thinking", normalizer.canonicalKey("Alibaba", "qwen3-max-thinking"));
        assertEquals("kimi:kimi-k2-thinking", normalizer.canonicalKey("Kimi", "kimi-k2-thinking"));
        assertEquals("kimi:kimi-k2", normalizer.canonicalKey("Kimi", "kimi-k2"));
        assertEquals("mistral:mistral-medium", normalizer.canonicalKey("Mistral", "mistral-medium"));
        assertEquals("perplexity:sonar-reasoning", normalizer.canonicalKey("Perplexity", "sonar-reasoning"));
    }

    @Test
    @DisplayName("去掉日期/上下文后缀：LMArena 检查点并入同名模型")
    void canonicalKey_stripsDateAndContextSuffix() {
        String base = normalizer.canonicalKey("Anthropic", "Claude Opus 4.5");
        assertEquals(base, normalizer.canonicalKey("anthropic", "claude-opus-4-5-20251101"));
        assertEquals(base, normalizer.canonicalKey("anthropic", "claude-opus-4-5-high-32k"));
    }

    @Test
    @DisplayName("上下文后缀 1m / 128k 仍剥离")
    void canonicalKey_stripsSmallContextSuffix() {
        String base = normalizer.canonicalKey("Google", "gemini-3-pro");
        assertEquals(base, normalizer.canonicalKey("google", "gemini-3-pro-1m"));
        assertEquals(base, normalizer.canonicalKey("google", "gemini-3-pro-128k"));
    }

    @Test
    @DisplayName("不误删参数量后缀：270m/350m 视为参数量而非上下文，不并入基名")
    void canonicalKey_doesNotStripParamSizesInMillions() {
        assertEquals("google:gemma-3-270m", normalizer.canonicalKey("Google", "gemma-3-270m"));
        assertEquals("ibm:granite-4-0-350m", normalizer.canonicalKey("IBM", "granite-4-0-350m"));
        assertEquals("ibm:granite-4-0-h-350m", normalizer.canonicalKey("IBM", "granite-4-0-h-350m"));
    }
}
