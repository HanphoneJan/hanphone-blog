package com.example.blog.hot.collector;

import com.example.blog.hot.HotSourceKeys;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Hugging Face 趋势采集器：trending 模型 / 数据集 / Space + Daily Papers。
 *
 * <p>各子源独立容错，单个子源失败不影响其余子源入库。</p>
 */
@Component
public class HuggingFaceCollector implements HotCollector {

    private static final Log log = LogFactory.getLog(HuggingFaceCollector.class);

    private static final String MODELS_PATH = "/api/models?sort=trendingScore&direction=-1&limit=20";
    private static final String DATASETS_PATH = "/api/datasets?sort=trendingScore&direction=-1&limit=10";
    private static final String SPACES_PATH = "/api/spaces?sort=trendingScore&direction=-1&limit=10";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /** Hub 地址（国内服务器可设为 https://hf-mirror.com） */
    @Value("${hot.hf.endpoint:https://huggingface.co}")
    private String endpoint;

    @Value("${hot.hf.token:}")
    private String token;

    public HuggingFaceCollector(RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(8))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return HotSourceKeys.HUGGINGFACE;
    }

    @Override
    public String category() {
        return HotSourceKeys.CATEGORY_HF;
    }

    @Override
    public String displayName() {
        return "Hugging Face 趋势";
    }

    @Override
    public String sourceUrl() {
        return "https://huggingface.co/models";
    }

    @Override
    public List<HotItemData> fetch() {
        List<HotItemData> out = new ArrayList<>();
        String base = endpoint == null || endpoint.isBlank()
                ? "https://huggingface.co"
                : endpoint.replaceAll("/+$", "");
        tryCollect(out, base + MODELS_PATH, node -> collectHubItems(out, node, "model", "hf:model:"));
        tryCollect(out, base + DATASETS_PATH, node -> collectHubItems(out, node, "dataset", "hf:dataset:"));
        tryCollect(out, base + SPACES_PATH, node -> collectHubItems(out, node, "space", "hf:space:"));
        log.info("Hugging Face 采集完成：" + out.size() + " 条");
        return out;
    }

    private void tryCollect(List<HotItemData> out, String url, java.util.function.Consumer<JsonNode> handler) {
        try {
            handler.accept(fetchJson(url));
        } catch (Exception e) {
            log.warn("HF 子源采集失败 " + url + "：" + e.getMessage());
        }
    }

    private void collectHubItems(List<HotItemData> out, JsonNode arr, String type, String prefix) {
        if (arr == null || !arr.isArray()) {
            return;
        }
        int rank = 1;
        for (JsonNode node : arr) {
            String id = node.path("id").asText(null);
            if (id == null || id.isBlank()) {
                continue;
            }
            double likes = node.path("likes").asDouble(0);
            double downloads = node.path("downloads").asDouble(0);
            double score = node.path("trendingScore").asDouble(likes);

            ObjectNode extra = objectMapper.createObjectNode();
            extra.put("type", type);
            extra.put("likes", likes);
            extra.put("downloads", downloads);
            extra.put("pipelineTag", node.path("pipeline_tag").asText(""));
            extra.put("lastModified", node.path("lastModified").asText(""));
            ArrayNode tags = extra.putArray("tags");
            if (node.path("tags").isArray()) {
                node.path("tags").forEach(t -> tags.add(t.asText()));
            }

            String tagStr = node.path("pipeline_tag").asText("");
            if (tagStr.isBlank() && node.path("tags").isArray() && node.path("tags").size() > 0) {
                tagStr = node.path("tags").get(0).asText("");
            }

            out.add(new HotItemData(
                    HotSourceKeys.CATEGORY_HF,
                    prefix + id,
                    id,
                    "https://huggingface.co/" + id,
                    node.path("author").asText(""),
                    tagStr,
                    score,
                    rank++,
                    extra.toString(),
                    parseDate(node.path("lastModified").asText(null))
            ));
        }
    }

    private JsonNode fetchJson(String url) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (token != null && !token.isBlank()) {
            headers.setBearerAuth(token.trim());
        }
        ResponseEntity<String> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        return objectMapper.readTree(resp.getBody());
    }

    private Date parseDate(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            return Date.from(OffsetDateTime.parse(iso).toInstant());
        } catch (Exception e) {
            return null;
        }
    }
}
