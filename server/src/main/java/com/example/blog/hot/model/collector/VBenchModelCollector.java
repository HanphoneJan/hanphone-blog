package com.example.blog.hot.model.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.ModelEntryData;
import com.example.blog.hot.model.ModelLeaderboardCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * VBench 文生视频质量榜单采集器。
 *
 * <p>数据来自 VBench 官方 Gradio Space 的表格接口
 * `POST https://vchitect-vbench-leaderboard.hf.space/api/get_baseline_df`，
 * 取每个模型的 Total Score 与 Quality Score。</p>
 */
@Component
public class VBenchModelCollector implements ModelLeaderboardCollector {

    private static final String URL = "https://vchitect-vbench-leaderboard.hf.space/api/get_baseline_df";
    private static final Pattern MD_LINK = Pattern.compile("\\[([^\\]]+)]\\(([^)]+)\\)");

    private final HttpJsonSupport http;

    public VBenchModelCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.VBENCH;
    }

    @Override
    public String displayName() {
        return "VBench";
    }

    @Override
    public String sourceUrl() {
        return "https://vchitect.github.io/VBench-project/";
    }

    @Override
    public List<ModelEntryData> fetch() throws Exception {
        JsonNode root = http.postJson(URL, "{\"data\":[]}", null);
        JsonNode table = root.path("data").path(0);
        JsonNode headers = table.path("headers");
        JsonNode rows = table.path("data");
        List<ModelEntryData> out = new ArrayList<>();
        if (!rows.isArray() || !headers.isArray()) {
            return out;
        }
        int nameIdx = indexOf(headers, "Model Name");
        int totalIdx = indexOf(headers, "Total Score");
        int qualityIdx = indexOf(headers, "Quality Score");
        if (nameIdx < 0 || totalIdx < 0) {
            return out;
        }

        int rank = 1;
        for (JsonNode row : rows) {
            String rawName = null;
            String link = null;
            String cell = row.path(nameIdx).asText("");
            Matcher m = MD_LINK.matcher(cell);
            if (m.find()) {
                rawName = m.group(1).trim();
                link = m.group(2).trim();
            } else if (!cell.isBlank()) {
                rawName = cell.trim();
            }
            Double total = parsePercent(row.path(totalIdx).asText(null));
            if (rawName == null || rawName.isBlank() || total == null) {
                continue;
            }
            Map<String, Double> benchmarks = new HashMap<>();
            benchmarks.put("vbench_total", total);
            Double quality = qualityIdx >= 0 ? parsePercent(row.path(qualityIdx).asText(null)) : null;
            if (quality != null) {
                benchmarks.put("vbench_quality", quality);
            }
            out.add(new ModelEntryData(rawName, null, "video", null, null, link, rank++, benchmarks,
                    null, null, null));
        }
        return out;
    }

    private int indexOf(JsonNode headers, String keyword) {
        for (int i = 0; i < headers.size(); i++) {
            if (headers.get(i).asText("").contains(keyword)) {
                return i;
            }
        }
        return -1;
    }

    private Double parsePercent(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value.trim().replace("%", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
