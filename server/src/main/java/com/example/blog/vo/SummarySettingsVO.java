package com.example.blog.vo;

import lombok.Data;

/**
 * AI 摘要配置（apiKey 不回传明文，仅告知是否已配置）。
 */
@Data
public class SummarySettingsVO {

    private String baseUrl;
    private String model;
    private String headers;
    private boolean enabled;
    private boolean hasApiKey;
}
