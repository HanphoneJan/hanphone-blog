package com.example.blog.hot.model.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.ModelEntryData;
import com.example.blog.hot.model.ModelLeaderboardCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Artificial Analysis 采集器：LLM 文本 + 图像 + 视频 + 语音竞技场。
 *
 * <p>免费 key 即可访问 language/models/free 与各 media 的 free 端点（100 次/24h）。
 * 未配置 `hot.aa.api-key` 时 {@link #enabled()} 返回 false，跳过且不计失败。</p>
 */
@Component
public class ArtificialAnalysisModelCollector implements ModelLeaderboardCollector {

    private static final Log log = LogFactory.getLog(ArtificialAnalysisModelCollector.class);
    private static final String BASE = "https://artificialanalysis.ai/api/v2";
    private static final int MAX_LANGUAGE_PAGES = 5;

    private final HttpJsonSupport http;

    @Value("${hot.aa.api-key:}")
    private String apiKey;

    public ArtificialAnalysisModelCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.ARTIFICIAL_ANALYSIS;
    }

    @Override
    public String displayName() {
        return "Artificial Analysis";
    }

    @Override
    public String sourceUrl() {
        return "https://artificialanalysis.ai/";
    }

    @Override
    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public List<ModelEntryData> fetch() throws Exception {
        Map<String, String> headers = Map.of("x-api-key", apiKey.trim());
        List<ModelEntryData> out = new ArrayList<>();
        fetchLanguage(out, headers);
        fetchArena(out, headers, "/media/text-to-image/models/free", "image", "aa_image_t2i");
        fetchArena(out, headers, "/media/image-editing/models/free", "image", "aa_image_edit");
        fetchArena(out, headers, "/media/text-to-video/models/free", "video", "aa_video_t2v");
        fetchArena(out, headers, "/media/image-to-video/models/free", "video", "aa_video_i2v");
        fetchArena(out, headers, "/media/text-to-speech/models/free", "speech", "aa_tts");
        return out;
    }

    private void fetchLanguage(List<ModelEntryData> out, Map<String, String> headers) {
        for (int page = 1; page <= MAX_LANGUAGE_PAGES; page++) {
            JsonNode root;
            try {
                root = http.getJson(BASE + "/language/models/free?page=" + page, headers);
            } catch (Exception e) {
                log.warn("AA 语言模型采集失败（page " + page + "）：" + e.getMessage());
                return;
            }
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                return;
            }
            for (JsonNode m : data) {
                String name = m.path("name").asText(null);
                if (name == null || name.isBlank()) {
                    continue;
                }
                JsonNode evaluations = m.path("evaluations");
                JsonNode pricing = m.path("pricing");
                Map<String, Double> benchmarks = new HashMap<>();
                putIfNotNull(benchmarks, "aa_intelligence", num(evaluations, "artificial_analysis_intelligence_index"));
                putIfNotNull(benchmarks, "aa_coding", num(evaluations, "artificial_analysis_coding_index"));
                putIfNotNull(benchmarks, "aa_agentic", num(evaluations, "artificial_analysis_agentic_index"));

                out.add(new ModelEntryData(
                        name,
                        vendorOf(m),
                        "text",
                        null,
                        http.parseIso(m.path("release_date").asText(null)),
                        null,
                        null,
                        benchmarks,
                        num(pricing, "price_1m_input_tokens"),
                        num(pricing, "price_1m_output_tokens"),
                        null
                ));
            }
            if (!root.path("pagination").path("has_more").asBoolean(false)) {
                return;
            }
        }
    }

    private void fetchArena(List<ModelEntryData> out, Map<String, String> headers, String path,
                            String modality, String benchmarkKey) {
        try {
            JsonNode root = http.getJson(BASE + path, headers);
            JsonNode data = extractArray(root);
            int rank = 1;
            for (JsonNode m : data) {
                String name = m.path("name").asText(null);
                if (name == null || name.isBlank()) {
                    continue;
                }
                Double score = num(m, "elo");
                if (score == null) {
                    score = num(m, "score");
                }
                if (score == null) {
                    // 无 Elo/分数的竞技场（如语音识别用 aa_wer_index）暂不纳入
                    continue;
                }
                Integer rowRank = m.path("rank").isNumber() ? m.path("rank").asInt() : rank;
                Date release = http.parseIso(m.path("release_date").asText(null));
                if (release == null) {
                    release = http.parseMonthYear(m.path("release_date").asText(null));
                }
                Map<String, Double> benchmarks = new HashMap<>();
                putIfNotNull(benchmarks, benchmarkKey, score);
                out.add(new ModelEntryData(
                        name, vendorOf(m), modality, null, release, null, rowRank, benchmarks, null, null, null));
                rank++;
            }
        } catch (Exception e) {
            log.warn("AA 竞技场采集失败 " + path + "：" + e.getMessage());
        }
    }

    private JsonNode extractArray(JsonNode root) {
        if (root.isArray()) {
            return root;
        }
        JsonNode data = root.path("data");
        if (data.isArray()) {
            return data;
        }
        if (data.isObject()) {
            for (JsonNode field : data) {
                if (field.isArray()) {
                    return field;
                }
            }
        }
        return root.path("data");
    }

    private String vendorOf(JsonNode node) {
        JsonNode creator = node.path("model_creator");
        if (creator.isObject()) {
            return creator.path("name").asText("");
        }
        if (creator.isTextual()) {
            return creator.asText("");
        }
        return node.path("model_org").asText("");
    }

    private Double num(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNumber() ? value.asDouble() : null;
    }

    private void putIfNotNull(Map<String, Double> map, String key, Double value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}
