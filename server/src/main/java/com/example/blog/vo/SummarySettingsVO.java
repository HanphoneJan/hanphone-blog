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
    /** 生效状态：开关打开且配置完整 */
    private boolean enabled;
    /** 配置是否完整（与开关无关） */
    private boolean configured;
    /** 后台启用开关明文（默认 true），供前端开关回显 */
    private boolean toggleEnabled;
    private boolean hasApiKey;
}
