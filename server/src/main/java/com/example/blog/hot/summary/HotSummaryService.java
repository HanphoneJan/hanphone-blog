package com.example.blog.hot.summary;

/**
 * 中文摘要抽象层。
 *
 * <p>未配置 LLM provider（`hot.summary.*`）时 {@link #isEnabled()} 返回 false，
 * 调用方跳过摘要生成，页面直接展示原文，不产生任何外部请求。</p>
 */
public interface HotSummaryService {

    /** 是否已配置可用的 provider */
    boolean isEnabled();

    /**
     * 生成一句中文摘要。
     *
     * @return 摘要文本；未启用或失败时返回 {@code null}
     */
    String summarize(String title, String rawText);
}
