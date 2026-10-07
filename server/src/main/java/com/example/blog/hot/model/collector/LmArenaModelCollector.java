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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LMArena 竞技场榜单采集器。
 *
 * <p>数据来自 Hugging Face 数据集 `lmarena-ai/leaderboard-dataset` 的 `latest` split
 * （通过 datasets-server rows API）。分别采集文本、Agent、文生图、图像编辑、文生视频、图生视频。</p>
 */
@Component
public class LmArenaModelCollector implements ModelLeaderboardCollector {

    private static final Log log = LogFactory.getLog(LmArenaModelCollector.class);
    private static final String ROWS_PATH = "/rows";
    private static final String DATASET = "lmarena-ai%2Fleaderboard-dataset";
    private static final int PAGE_SIZE = 100;
    private static final int MAX_ROWS = 400;

    /** datasets-server 地址；部分网络环境不可达时可整体关闭或走代理 */
    @Value("${hot.lmarena.endpoint:https://datasets-server.huggingface.co}")
    private String endpoint;

    @Value("${hot.lmarena.enabled:true}")
    private boolean enabled;

    private record ArenaConfig(String config, String benchmarkKey, String modality, String scoreField) {
    }

    private static final List<ArenaConfig> CONFIGS = List.of(
            new ArenaConfig("text_style_control", "lmarena_text", "text", "rating"),
            new ArenaConfig("agent", "lmarena_agent", "agent", "score"),
            new ArenaConfig("text_to_image", "lmarena_image_t2i", "image", "rating"),
            new ArenaConfig("image_edit", "lmarena_image_edit", "image", "rating"),
            new ArenaConfig("text_to_video", "lmarena_video_t2v", "video", "rating"),
            new ArenaConfig("image_to_video", "lmarena_video_i2v", "video", "rating")
    );

    private final HttpJsonSupport http;

    public LmArenaModelCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.LMARENA;
    }

    @Override
    public String displayName() {
        return "LMArena 竞技场";
    }

    @Override
    public String sourceUrl() {
        return "https://arena.ai/leaderboard";
    }

    @Override
    public boolean enabled() {
        return enabled;
    }

    @Override
    public List<ModelEntryData> fetch() {
        List<ModelEntryData> out = new ArrayList<>();
        for (ArenaConfig config : CONFIGS) {
            try {
                collect(out, config);
            } catch (Exception e) {
                log.warn("LMArena 采集失败 " + config.config() + "：" + e.getMessage());
            }
        }
        return out;
    }

    private void collect(List<ModelEntryData> out, ArenaConfig config) throws Exception {
        int offset = 0;
        while (offset < MAX_ROWS) {
            String url = endpoint.replaceAll("/+$", "") + ROWS_PATH + "?dataset=" + DATASET + "&config=" + config.config()
                    + "&split=latest&offset=" + offset + "&length=" + PAGE_SIZE;
            JsonNode root = http.getJson(url, null);
            JsonNode rows = root.path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                return;
            }
            for (JsonNode rowNode : rows) {
                JsonNode row = rowNode.path("row");
                String category = row.path("category").asText("");
                // 只取总榜，避免各子类别重复
                if (!category.isBlank() && !"overall".equalsIgnoreCase(category)) {
                    continue;
                }
                String modelName = row.path("model_name").asText(null);
                if (modelName == null || modelName.isBlank()) {
                    continue;
                }
                Double score = num(row, config.scoreField());
                if (score == null) {
                    continue;
                }
                Integer rank = row.path("rank").isNumber() ? row.path("rank").asInt() : null;
                Map<String, Double> benchmarks = new HashMap<>();
                benchmarks.put(config.benchmarkKey(), score);

                out.add(new ModelEntryData(
                        modelName,
                        row.path("organization").asText(""),
                        config.modality(),
                        null,
                        null,
                        "https://arena.ai/leaderboard",
                        rank,
                        benchmarks,
                        null, null, null
                ));
            }
            int total = root.path("num_rows_total").asInt(0);
            offset += rows.size();
            if (rows.size() < PAGE_SIZE || (total > 0 && offset >= total)) {
                return;
            }
        }
    }

    private Double num(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNumber() ? value.asDouble() : null;
    }
}
