package com.example.blog.hot.model.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.ModelEntryData;
import com.example.blog.hot.model.ModelLeaderboardCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * MTEB 嵌入模型榜单采集器（新版 leaderboard 后端 API）。
 *
 * <p>覆盖 MTEB(eng, v2) 与 MTEB(cmn, v1) 两个代表榜；每个模型取 meanTask 作为分数。</p>
 */
@Component
public class MtebModelCollector implements ModelLeaderboardCollector {

    private static final String BASE = "https://mteb-leaderboard-backend.hf.space/v1/benchmarks/";

    private final HttpJsonSupport http;

    public MtebModelCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.MTEB;
    }

    @Override
    public String displayName() {
        return "MTEB Leaderboard";
    }

    @Override
    public String sourceUrl() {
        return "https://mteb-leaderboard.hf.space/";
    }

    @Override
    public List<ModelEntryData> fetch() throws Exception {
        List<ModelEntryData> out = new ArrayList<>();
        collect(out, "MTEB(eng, v2)", "mteb_eng_v2");
        collect(out, "MTEB(cmn, v1)", "mteb_cmn_v1");
        return out;
    }

    private void collect(List<ModelEntryData> out, String benchmarkName, String benchmarkKey) throws Exception {
        String encoded = URLEncoder.encode(benchmarkName, StandardCharsets.UTF_8).replace("+", "%20");
        // 用 URI 直连，避免 RestTemplate 对已编码路径二次编码
        JsonNode root = http.getJson(java.net.URI.create(BASE + encoded + "/scores"), null);
        JsonNode rows = root.path("rows");
        if (!rows.isArray()) {
            return;
        }
        for (JsonNode row : rows) {
            JsonNode model = row.path("model");
            String rawName = model.path("name").asText(null);
            if (rawName == null || rawName.isBlank() || isGeneric(rawName)) {
                continue;
            }
            String vendor = rawName.contains("/") ? rawName.substring(0, rawName.indexOf('/')) : "";
            Double score = num(row, "meanTask");
            Integer rank = row.path("rank").isNumber() ? row.path("rank").asInt() : null;
            Boolean openWeights = model.path("openWeights").isBoolean() ? model.path("openWeights").asBoolean() : null;
            Date release = http.parseIso(model.path("releaseDate").asText(null));
            String link = model.path("url").asText(null);

            Map<String, Double> benchmarks = score == null ? Map.of() : Map.of(benchmarkKey, score);
            out.add(new ModelEntryData(
                    rawName, vendor, "embedding", openWeights, release, link, rank, benchmarks, null, null, null));
        }
    }

    private Double num(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNumber() ? value.asDouble() : null;
    }

    /** 泛指/基线条目（非具体模型），不作为模型入库 */
    private boolean isGeneric(String rawName) {
        String n = rawName.trim().toLowerCase();
        return n.contains("baseline") || n.contains("random-encoder") || n.endsWith("/baseline")
                || n.contains("test-model") || n.contains("dummy");
    }
}
