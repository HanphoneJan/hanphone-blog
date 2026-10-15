package com.example.blog.hot;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * 热点采集完成后的推送通知。
 *
 * 通过 hanphone-chat 的内部接口 `/chat-api/internal/push` 广播 FCM（Android App 收「热点已更新」通知）。
 * 未配置 {@code internal.api.key} 或聊天服务不可用时静默跳过，绝不影响采集主流程。
 */
@Service
public class HotPushNotifier {

    private static final Log log = LogFactory.getLog(HotPushNotifier.class);
    private static final String PUSH_ENDPOINT = "/chat-api/internal/push";

    @Value("${internal.api.key:}")
    private String internalApiKey;

    @Value("${chat.api.base-url:http://127.0.0.1:4010}")
    private String chatApiBaseUrl;

    private final RestTemplate restTemplate;

    public HotPushNotifier(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
    }

    /** 采集成功后广播一条「热点已更新」推送 */
    public void notifyUpdated(String title, String body) {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            log.info("未配置 internal.api.key，跳过热点推送");
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-internal-key", internalApiKey);

            Map<String, Object> payload = new HashMap<>();
            payload.put("title", title);
            payload.put("body", body);

            String url = chatApiBaseUrl.replaceAll("/+$", "") + PUSH_ENDPOINT;
            restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), String.class);
            log.info("已触发热点更新推送");
        } catch (Exception e) {
            log.warn("热点推送失败（不影响采集）：" + e.getMessage());
        }
    }
}
