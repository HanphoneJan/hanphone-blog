package com.example.blog.hot.model.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.ModelEntryData;
import com.example.blog.hot.model.ModelLeaderboardCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenRouter 模型目录采集器：提供价格与上下文窗口（无榜单分数），
 * 用于「模型综合对比」的价格维度。无需鉴权。
 */
@Component
public class OpenRouterModelCollector implements ModelLeaderboardCollector {

    private static final String URL = "https://openrouter.ai/api/v1/models";

    private final HttpJsonSupport http;

    public OpenRouterModelCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.OPENROUTER;
    }

    @Override
    public String displayName() {
        return "OpenRouter 模型目录";
    }

    @Override
    public String sourceUrl() {
        return "https://openrouter.ai/models";
    }

    @Override
    public List<ModelEntryData> fetch() throws Exception {
        JsonNode root = http.getJson(URL, null);
        JsonNode data = root.path("data");
        List<ModelEntryData> out = new ArrayList<>();
        if (!data.isArray()) {
            return out;
        }
        for (JsonNode m : data) {
            String id = m.path("id").asText(null);
            if (id == null || id.isBlank()) {
                continue;
            }
            String vendor = id.contains("/") ? id.substring(0, id.indexOf('/')) : "";
            JsonNode pricing = m.path("pricing");
            Integer context = m.path("context_length").isNumber() ? m.path("context_length").asInt() : null;

            // OpenRouter 的 architecture.modality 形如 "text->text"/"text->embeddings"
            String archModality = m.path("architecture").path("modality").asText("");
            String modality = archModality.contains("embeddings") ? "embedding" : "text";

            out.add(new ModelEntryData(
                    id,
                    vendor,
                    modality,
                    null,
                    null,
                    "https://openrouter.ai/models/" + id,
                    null,
                    Map.of(),
                    perTokenToPerMillion(pricing.path("prompt")),
                    perTokenToPerMillion(pricing.path("completion")),
                    context
            ));
        }
        return out;
    }

    /** OpenRouter 定价为「每 token 美元」字符串，转换为「每百万 token 美元」 */
    private Double perTokenToPerMillion(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        try {
            double perToken = Double.parseDouble(node.asText());
            if (perToken < 0) {
                return null;
            }
            return perToken * 1_000_000;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
