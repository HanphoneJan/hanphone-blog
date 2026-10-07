package com.example.blog.hot.summary;

import com.example.blog.dao.HotSettingRepository;
import com.example.blog.po.HotSetting;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AI 摘要配置：优先取数据库（后台可改），否则回落到环境变量默认值。
 *
 * <p>支持自定义请求头（多行 `Key: Value`，如 `x-opencode-session: xxx`）。</p>
 */
@Service
public class HotSummaryConfigService {

    public static final String KEY_BASE_URL = "summary.baseUrl";
    public static final String KEY_API_KEY = "summary.apiKey";
    public static final String KEY_MODEL = "summary.model";
    public static final String KEY_HEADERS = "summary.headers";

    private final HotSettingRepository repository;

    @Value("${hot.summary.base-url:}")
    private String defaultBaseUrl;

    @Value("${hot.summary.api-key:}")
    private String defaultApiKey;

    @Value("${hot.summary.model:}")
    private String defaultModel;

    public HotSummaryConfigService(HotSettingRepository repository) {
        this.repository = repository;
    }

    public String baseUrl() {
        return get(KEY_BASE_URL, defaultBaseUrl);
    }

    public String apiKey() {
        return get(KEY_API_KEY, defaultApiKey);
    }

    public String model() {
        return get(KEY_MODEL, defaultModel);
    }

    /** 自定义请求头原始文本（多行 Key: Value） */
    public String headersText() {
        return get(KEY_HEADERS, "");
    }

    /** 解析自定义请求头 */
    public Map<String, String> headers() {
        Map<String, String> map = new LinkedHashMap<>();
        String text = headersText();
        if (text == null || text.isBlank()) {
            return map;
        }
        for (String line : text.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            int idx = trimmed.indexOf(':');
            if (idx <= 0) {
                continue;
            }
            String name = trimmed.substring(0, idx).trim();
            String value = trimmed.substring(idx + 1).trim();
            if (!name.isEmpty()) {
                map.put(name, value);
            }
        }
        return map;
    }

    /** baseUrl 与 model 必填；密钥可用 API Key 或自定义 Header 之一 */
    public boolean isEnabled() {
        boolean credential = notBlank(apiKey()) || !headers().isEmpty();
        return notBlank(baseUrl()) && notBlank(model()) && credential;
    }

    public boolean hasApiKey() {
        return notBlank(apiKey());
    }

    /**
     * 保存配置。空值表示不修改该项（避免前端回显覆盖）。
     */
    public void save(String baseUrl, String apiKey, String model, String headers) {
        setIfPresent(KEY_BASE_URL, baseUrl);
        setIfPresent(KEY_API_KEY, apiKey);
        setIfPresent(KEY_MODEL, model);
        setIfPresent(KEY_HEADERS, headers);
    }

    private void setIfPresent(String key, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        set(key, value.trim());
    }

    private String get(String key, String fallback) {
        return repository.findBySettingKey(key)
                .map(HotSetting::getSettingValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(fallback);
    }

    private void set(String key, String value) {
        HotSetting setting = repository.findBySettingKey(key).orElseGet(HotSetting::new);
        if (setting.getId() == null) {
            setting.setSettingKey(key);
        }
        setting.setSettingValue(value);
        repository.save(setting);
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
