package com.example.blog.hot.model.collector;

import com.example.blog.hot.model.ModelEntryData;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Terminal-Bench RSC 负载解析单元测试。
 */
class TerminalBenchModelCollectorTest {

    private final TerminalBenchModelCollector collector =
            new TerminalBenchModelCollector(new HttpJsonSupport(new RestTemplateBuilder(), new ObjectMapper()),
                    new ObjectMapper());

    @Test
    @DisplayName("从 Next.js RSC 负载中解析 rows 并去重取最佳成绩")
    void parse_rscPayload() throws Exception {
        String rowA = "{\"rank\":1,\"metadata\":{\"model_display\":{\"url\":\"https://a\",\"label\":\"Opus 5.5\"},"
                + "\"model_org\":{\"label\":\"Anthropic\"},\"date\":\"2026-09-22\"},\"metrics\":{\"accuracy\":64.85}}";
        String rowB = "{\"rank\":2,\"metadata\":{\"model_display\":{\"url\":\"https://a\",\"label\":\"Opus 5.5\"},"
                + "\"model_org\":{\"label\":\"Anthropic\"},\"date\":\"2026-09-22\"},\"metrics\":{\"accuracy\":52.0}}";
        String rowC = "{\"rank\":3,\"metadata\":{\"model_display\":{\"url\":\"https://b\",\"label\":\"GPT-6\"},"
                + "\"model_org\":{\"label\":\"OpenAI\"},\"date\":\"2026-09-03\"},\"metrics\":{\"accuracy\":58.2}}";
        String flight = "[{\"dehydratedAt\":1,\"state\":{\"data\":{\"rows\":["
                + rowA + "," + rowB + "," + rowC + "]}}}]";
        String escaped = flight.replace("\\", "\\\\").replace("\"", "\\\"");
        String html = "<script>self.__next_f.push([1,\"" + escaped + "\"])</script>";

        List<ModelEntryData> rows = collector.parse(html);

        assertEquals(2, rows.size(), "同模型应去重");
        assertEquals("Opus 5.5", rows.get(0).rawName());
        assertEquals(1, rows.get(0).rank());
        assertEquals(64.85, rows.get(0).benchmarks().get("terminal_bench"), 0.001);
        assertTrue(rows.get(0).releaseDate() != null, "纯日期应可解析");
        assertEquals("GPT-6", rows.get(1).rawName());
        assertEquals(58.2, rows.get(1).benchmarks().get("terminal_bench"), 0.001);
    }
}
