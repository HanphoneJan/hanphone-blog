package com.example.blog.hot.model;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 厂商归一化 + 重点厂商排序。
 *
 * <p>各信源（OpenRouter / HF / Artificial Analysis / LMArena…）的 vendor 命名不一致
 * （大小写、连字符、子品牌/实验室名、个别带前缀 {@code ~}），这里统一：
 * <ul>
 *   <li>去掉前缀 {@code ~}、去空白、统一小写得到「归一 key」（自动合并大小写变体）；</li>
 *   <li>别名表把同一家公司的多个名字（如 Alibaba/Alibaba-ATH/Qwen、z-ai/Z.ai、Mistral/mistralai）
 *       归到同一个 key；</li>
 *   <li>规范名 label 用于展示（未知厂商取出现次数最多的原始写法）。</li>
 * </ul>
 */
@Component
public class VendorRegistry {

    /** 规范展示名 → 归入它的原始别名 */
    private static final Map<String, List<String>> ALIASES = new LinkedHashMap<>();

    /** 重点厂商（对比页「按公司」置顶），顺序即展示优先级 */
    private static final List<String> FOCUSED = List.of(
            "Anthropic", "DeepSeek", "OpenAI", "Kimi", "Alibaba",
            "Z.ai", "Google", "Xiaomi", "ByteDance"
    );

    static {
        ALIASES.put("Alibaba", List.of("alibaba", "alibaba-ath", "alibaba-nlp", "qwen"));
        ALIASES.put("OpenAI", List.of("openai"));
        ALIASES.put("Google", List.of("google", "google deepmind", "google-deepmind"));
        ALIASES.put("Anthropic", List.of("anthropic"));
        ALIASES.put("DeepSeek", List.of("deepseek"));
        ALIASES.put("Kimi", List.of("kimi", "moonshot", "moonshot ai", "moonshotai"));
        ALIASES.put("Z.ai", List.of("z-ai", "z.ai", "zai", "z ai"));
        ALIASES.put("ByteDance", List.of("bytedance", "bytedance seed", "bytedance-seed"));
        ALIASES.put("Xiaomi", List.of("xiaomi"));
        ALIASES.put("Meta", List.of("meta", "meta-llama", "facebook", "facebookai"));
        ALIASES.put("MiniMax", List.of("minimax"));
        ALIASES.put("Mistral", List.of("mistral", "mistralai"));
        ALIASES.put("Tencent", List.of("tencent", "tencentbac"));
        ALIASES.put("Microsoft AI", List.of("microsoft", "microsoft ai"));
        ALIASES.put("InclusionAI", List.of("inclusionai"));
        ALIASES.put("Black Forest Labs", List.of("black forest labs"));
        ALIASES.put("ElevenLabs", List.of("elevenlabs"));
        ALIASES.put("Lightricks", List.of("lightricks"));
        ALIASES.put("StepFun", List.of("stepfun"));
        ALIASES.put("xAI", List.of("x-ai", "xai", "spacexai"));
        ALIASES.put("IBM", List.of("ibm", "ibm-granite"));
        ALIASES.put("NVIDIA", List.of("nvidia"));
        ALIASES.put("MongoDB", List.of("mongodb"));
        ALIASES.put("Amazon", List.of("amazon"));
        ALIASES.put("Cohere", List.of("cohere"));
        ALIASES.put("Upstage", List.of("upstage"));
        ALIASES.put("Perplexity", List.of("perplexity", "perplexity-ai"));
        ALIASES.put("Baidu", List.of("baidu"));
        ALIASES.put("OpenBMB", List.of("openbmb"));
        ALIASES.put("Apodex", List.of("apodex"));
        ALIASES.put("Meituan", List.of("meituan"));
        ALIASES.put("Thinking Machines", List.of("thinking machines", "thinkingmachines"));
        ALIASES.put("Nous Research", List.of("nous research", "nousresearch"));
        ALIASES.put("Reka AI", List.of("reka ai", "rekaai"));
        ALIASES.put("Nex AGI", List.of("nex agi", "nex-agi"));
        ALIASES.put("Liquid AI", List.of("liquid ai", "liquid"));
    }

    /** 别名（小写）→ 归一 key */
    private final Map<String, String> aliasToKey = new LinkedHashMap<>();

    /** 归一 key → 规范展示名（仅已知厂商） */
    private final Map<String, String> keyToLabel = new LinkedHashMap<>();

    /** 归一 key → 重点排序（越小越靠前） */
    private final Map<String, Integer> focusRank = new LinkedHashMap<>();

    public VendorRegistry() {
        ALIASES.forEach((label, aliases) -> {
            String key = normalize(label);
            keyToLabel.put(key, label);
            aliasToKey.put(key, key);
            for (String alias : aliases) {
                aliasToKey.put(normalize(alias), key);
            }
        });
        for (int i = 0; i < FOCUSED.size(); i++) {
            String label = FOCUSED.get(i);
            String key = normalize(label);
            keyToLabel.put(key, label);
            aliasToKey.putIfAbsent(key, key);
            focusRank.put(key, i);
        }
    }

    private static String normalize(String raw) {
        String s = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        while (s.startsWith("~")) {
            s = s.substring(1).trim();
        }
        return s;
    }

    /** 原始 vendor → 归一 key；空值返回 null（不参与「按公司」分组） */
    public String key(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String k = normalize(raw);
        if (k.isEmpty()) {
            return null;
        }
        return aliasToKey.getOrDefault(k, k);
    }

    /** 归一 key → 规范展示名；未知厂商返回 null（由调用方取最常见的原始写法） */
    public String label(String key) {
        return key == null ? null : keyToLabel.get(key);
    }

    public boolean isFocused(String key) {
        return key != null && focusRank.containsKey(key);
    }

    /** 重点排序权重；非重点返回 Integer.MAX_VALUE（排在最后） */
    public int focusRank(String key) {
        return key == null ? Integer.MAX_VALUE : focusRank.getOrDefault(key, Integer.MAX_VALUE);
    }
}
