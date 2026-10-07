package com.example.blog.hot.model.collector;

import com.example.blog.hot.HotSourceKeys;
import com.example.blog.hot.model.ModelEntryData;
import com.example.blog.hot.model.ModelLeaderboardCollector;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Terminal-Bench 代码 Agent 榜单采集器。
 *
 * <p>tbench.ai 为 Next.js RSC 渲染，榜单数据内嵌在 `self.__next_f.push` 负载中。
 * 这里还原负载后解析出 rows，按模型取最佳（accuracy 最高）成绩。</p>
 */
@Component
public class TerminalBenchModelCollector implements ModelLeaderboardCollector {

    private static final String URL = "https://www.tbench.ai/";
    private static final String BENCHMARK_KEY = "terminal_bench";
    private static final Pattern PUSH = Pattern.compile(
            "self\\.__next_f\\.push\\(\\[\\d+,\"(.*?)\"\\]\\)", Pattern.DOTALL);

    private final HttpJsonSupport http;
    private final ObjectMapper objectMapper;

    public TerminalBenchModelCollector(HttpJsonSupport http, ObjectMapper objectMapper) {
        this.http = http;
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return HotSourceKeys.TERMINAL_BENCH;
    }

    @Override
    public String displayName() {
        return "Terminal-Bench";
    }

    @Override
    public String sourceUrl() {
        return URL;
    }

    @Override
    public List<ModelEntryData> fetch() throws Exception {
        return parse(http.getRaw(URL, null, List.of(MediaType.TEXT_HTML)));
    }

    /** 解析 tbench.ai 首页 HTML（抽出便于单测） */
    List<ModelEntryData> parse(String html) throws Exception {
        String flight = unescapeFlight(html);
        int marker = flight.indexOf("dehydratedAt");
        if (marker < 0) {
            throw new IllegalStateException("未找到 Terminal-Bench 数据结构");
        }
        int rowsIdx = flight.indexOf("\"rows\":[", marker);
        if (rowsIdx < 0) {
            throw new IllegalStateException("未找到 Terminal-Bench rows");
        }
        int arrStart = flight.indexOf('[', rowsIdx);
        String json = extractArray(flight, arrStart);
        if (json == null) {
            throw new IllegalStateException("Terminal-Bench 数据片段不完整");
        }
        JsonNode rows = objectMapper.readTree(json);
        if (!rows.isArray()) {
            return List.of();
        }

        Map<String, ModelEntryData> best = new LinkedHashMap<>();
        for (JsonNode row : rows) {
            JsonNode metadata = row.path("metadata");
            String label = metadata.path("model_display").path("label").asText(null);
            Double accuracy = row.path("metrics").path("accuracy").isNumber()
                    ? row.path("metrics").path("accuracy").asDouble() : null;
            if (label == null || label.isBlank() || accuracy == null) {
                continue;
            }
            String key = label.toLowerCase();
            ModelEntryData prev = best.get(key);
            double prevScore = prev == null ? Double.NEGATIVE_INFINITY
                    : prev.benchmarks().getOrDefault(BENCHMARK_KEY, Double.NEGATIVE_INFINITY);
            if (prev == null || accuracy > prevScore) {
                best.put(key, new ModelEntryData(
                        label,
                        metadata.path("model_org").path("label").asText(""),
                        "coding",
                        null,
                        http.parseDate(metadata.path("date").asText(null)),
                        metadata.path("model_display").path("url").asText(null),
                        null,
                        Map.of(BENCHMARK_KEY, accuracy),
                        null, null, null));
            }
        }

        List<ModelEntryData> list = new ArrayList<>(best.values());
        list.sort(Comparator.comparingDouble(
                (ModelEntryData e) -> e.benchmarks().getOrDefault(BENCHMARK_KEY, 0.0)).reversed());
        List<ModelEntryData> out = new ArrayList<>();
        int rank = 1;
        for (ModelEntryData e : list) {
            out.add(new ModelEntryData(e.rawName(), e.vendor(), e.modality(), e.openWeights(),
                    e.releaseDate(), e.link(), rank++, e.benchmarks(),
                    e.inputPrice(), e.outputPrice(), e.contextWindow()));
        }
        return out;
    }

    /** 还原 RSC 负载：提取每段 push 的字符串字面量并手工反转义后拼接 */
    private String unescapeFlight(String html) {
        StringBuilder sb = new StringBuilder();
        Matcher matcher = PUSH.matcher(html);
        while (matcher.find()) {
            sb.append(unescape(matcher.group(1)));
        }
        return sb.toString();
    }

    private String unescape(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '\\') {
                sb.append(c);
                continue;
            }
            if (i + 1 >= s.length()) {
                break;
            }
            char n = s.charAt(++i);
            switch (n) {
                case 'n' -> sb.append('\n');
                case 'r' -> sb.append('\r');
                case 't' -> sb.append('\t');
                case 'b' -> sb.append('\b');
                case 'f' -> sb.append('\f');
                case '"' -> sb.append('"');
                case '\\' -> sb.append('\\');
                case '/' -> sb.append('/');
                case 'u' -> {
                    if (i + 4 < s.length()) {
                        try {
                            sb.append((char) Integer.parseInt(s.substring(i + 1, i + 5), 16));
                            i += 4;
                        } catch (NumberFormatException e) {
                            sb.append(n);
                        }
                    }
                }
                default -> sb.append(n);
            }
        }
        return sb.toString();
    }

    /** 从 start 处的 '[' 起做括号匹配，返回完整 JSON 数组字符串 */
    private String extractArray(String text, int start) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = start; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (ch == '\\') {
                    escaped = true;
                } else if (ch == '"') {
                    inString = false;
                }
                continue;
            }
            if (ch == '"') {
                inString = true;
            } else if (ch == '[') {
                depth++;
            } else if (ch == ']') {
                depth--;
                if (depth == 0) {
                    return text.substring(start, i + 1);
                }
            }
        }
        return null;
    }
}
