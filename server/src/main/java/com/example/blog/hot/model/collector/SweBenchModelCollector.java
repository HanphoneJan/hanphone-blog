package com.example.blog.hot.model.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.ModelEntryData;
import com.example.blog.hot.model.ModelLeaderboardCollector;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SWE-bench 代码 Agent 榜单采集器。
 *
 * <p>数据内嵌于 swebench.com 首页 HTML 的 `leaderboard-data` script 中，
 * 取 Verified 榜按 resolved% 排序。</p>
 */
@Component
public class SweBenchModelCollector implements ModelLeaderboardCollector {

    private static final String URL = "https://www.swebench.com/";
    private static final Pattern DATA_PATTERN =
            Pattern.compile("id=\"leaderboard-data\"[^>]*>(.*?)</script>", Pattern.DOTALL);
    private static final Pattern TAG_MODEL = Pattern.compile("Model:\\s*([^,|]+)");

    private final HttpJsonSupport http;

    public SweBenchModelCollector(HttpJsonSupport http) {
        this.http = http;
    }

    @Override
    public String key() {
        return HotSourceKeys.SWE_BENCH;
    }

    @Override
    public String displayName() {
        return "SWE-bench";
    }

    @Override
    public String sourceUrl() {
        return URL;
    }

    @Override
    public List<ModelEntryData> fetch() throws Exception {
        String html = http.getRaw(URL, null, List.of(MediaType.TEXT_HTML));
        Matcher matcher = DATA_PATTERN.matcher(html);
        if (!matcher.find()) {
            throw new IllegalStateException("未在 swebench.com 找到 leaderboard-data");
        }
        JsonNode boards = http.readTree(matcher.group(1));

        JsonNode verified = null;
        for (JsonNode board : boards) {
            if ("Verified".equalsIgnoreCase(board.path("name").asText())) {
                verified = board;
                break;
            }
        }
        List<ModelEntryData> out = new ArrayList<>();
        if (verified == null) {
            return out;
        }

        List<JsonNode> results = new ArrayList<>();
        verified.path("results").forEach(results::add);
        results.sort(Comparator.comparingDouble((JsonNode r) -> numOrZero(r, "resolved")).reversed());

        int rank = 1;
        for (JsonNode r : results) {
            Double resolved = num(r, "resolved");
            if (resolved == null) {
                continue;
            }
            String name = r.path("model_display").asText(null);
            if (name == null || name.isBlank()) {
                name = extractModelFromTags(r.path("tags"));
            }
            if (name == null || name.isBlank()) {
                continue;
            }
            out.add(new ModelEntryData(
                    name,
                    r.path("model_org").asText(""),
                    "coding",
                    null,
                    http.parseDate(r.path("date").asText(null)),
                    null,
                    rank++,
                    Map.of("swe_bench_verified", resolved),
                    null, null, null
            ));
        }
        return out;
    }

    private String extractModelFromTags(JsonNode tags) {
        if (tags == null || !tags.isArray()) {
            return null;
        }
        for (JsonNode tag : tags) {
            Matcher m = TAG_MODEL.matcher(tag.asText(""));
            if (m.find()) {
                return m.group(1).trim();
            }
        }
        return null;
    }

    private Double num(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNumber() ? value.asDouble() : null;
    }

    private double numOrZero(JsonNode node, String field) {
        Double v = num(node, field);
        return v == null ? 0 : v;
    }
}
