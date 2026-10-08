package com.example.blog.hot.model;

import java.util.Arrays;
import java.util.Set;

/**
 * 模型名归一工具：去掉「推理强度 / 日期 / 上下文窗口」等后缀，供**入库**（canonical_key）与**展示**共用。
 *
 * <p>例：{@code claude-opus-5-high} → {@code claude-opus-5}、{@code gpt-5.3-20260210} → {@code gpt-5.3}。</p>
 */
public final class ModelNameUtil {

    private ModelNameUtil() {
    }

    private static final Set<String> VARIANT_TOKENS = Set.of(
            "high", "xhigh", "low", "medium", "minimal", "max",
            "thinking", "reasoning", "reasoner", "non", "default", "fallback", "standard",
            "latest", "preview", "exp", "experimental", "batch");

    public static boolean isStrippable(String token) {
        if (VARIANT_TOKENS.contains(token)) {
            return true;
        }
        return token.matches("beta\\d*")          // beta / beta1
                || token.matches("\\d{6,}")        // 日期/时间戳，如 20251101
                || token.matches("\\d+(k|m)");     // 上下文窗口，如 32k / 1m（不含 b，避免误删参数量）
    }

    /** 反复去掉结尾的可剥离 token（至少保留 1 个 token） */
    public static String stripVariantSuffix(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        String[] parts = slug.split("-");
        int end = parts.length;
        while (end > 1 && isStrippable(parts[end - 1])) {
            end--;
        }
        if (end == parts.length) {
            return slug;
        }
        return String.join("-", Arrays.copyOfRange(parts, 0, end));
    }

    /**
     * 展示名归一：对「用连字符分隔」的名称（如 LMArena 的 slug）去掉变体/日期/上下文后缀。
     * 含空格/括号的普通名称（AA 的 {@code Claude Opus 5 (Xhigh)}）原样返回，避免误伤。
     */
    public static String normalizeDisplayName(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            return rawName;
        }
        String s = rawName.trim();
        if (s.contains(" ") || s.contains("(")) {
            return s;
        }
        return stripVariantSuffix(s);
    }
}
