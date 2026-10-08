package com.example.blog.hot.summary;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * 基于 OpenAI 兼容 Chat Completions 接口的中文摘要实现。
 *
 * <p>配置（url/key/model）优先取数据库（后台「聚合数据」可改），否则回落环境变量。
 * 任一缺失即视为未启用，全部方法安全降级，不发请求。</p>
 */
@Service
public class HotSummaryServiceImpl implements HotSummaryService {

    private static final Log log = LogFactory.getLog(HotSummaryServiceImpl.class);
    private static final int MAX_RAW_LENGTH = 800;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final HotSummaryConfigService config;

    public HotSummaryServiceImpl(RestTemplateBuilder restTemplateBuilder,
                                 ObjectMapper objectMapper,
                                 HotSummaryConfigService config) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(8))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();
        this.objectMapper = objectMapper;
        this.config = config;
    }

    @Override
    public boolean isEnabled() {
        return config.isEnabled();
    }

    @Override
    public String summarize(String title, String rawText) {
        if (!isEnabled()) {
            return null;
        }
        try {
            String prompt = "请用一句不超过80字的中文客观概括以下技术内容，只输出摘要正文：\n"
                    + "标题：" + nvl(title) + "\n"
                    + "内容：" + truncate(nvl(rawText), MAX_RAW_LENGTH);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", config.model());
            ArrayNode messages = body.putArray("messages");
            ObjectNode msg = messages.addObject();
            msg.put("role", "user");
            msg.put("content", prompt);
            body.put("max_tokens", 1024);
            body.put("temperature", 0.3);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (config.apiKey() != null && !config.apiKey().isBlank()) {
                headers.setBearerAuth(config.apiKey().trim());
            }
            // 自定义请求头（可覆盖上述默认），如 x-opencode-session
            config.headers().forEach(headers::set);

            String base = config.baseUrl().trim();
            String url = base.endsWith("/") ? base + "chat/completions" : base + "/chat/completions";
            ResponseEntity<String> resp = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body.toString(), headers), String.class);

            JsonNode root = objectMapper.readTree(resp.getBody());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            return content.isBlank() ? null : content.trim();
        } catch (Exception e) {
            log.warn("AI 摘要生成失败：" + e.getMessage());
            return null;
        }
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
