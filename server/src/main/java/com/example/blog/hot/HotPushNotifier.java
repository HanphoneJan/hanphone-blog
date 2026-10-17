package com.example.blog.hot;

import com.example.blog.push.FcmPushService;
import com.example.blog.push.PushMessage;
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
 * <p>由博客 server 直接经 FCM 广播（{@link FcmPushService}，向 {@code device_token} 表里的全部设备），
 * 不再经 chat-server。过渡兜底：当博客尚无设备 token（App 未升级到上报博客的版本）时，
 * 若 {@code hot.push.chat-fallback-enabled=true}，仍回退到 chat-server 的 {@code /chat-api/internal/push}。</p>
 */
@Service
public class HotPushNotifier {

    private static final Log log = LogFactory.getLog(HotPushNotifier.class);
    private static final String CHAT_PUSH_ENDPOINT = "/chat-api/internal/push";

    private final FcmPushService fcmPushService;
    private final RestTemplate restTemplate;

    @Value("${internal.api.key:}")
    private String internalApiKey;

    @Value("${chat.api.base-url:http://127.0.0.1:4010}")
    private String chatApiBaseUrl;

    /** 过渡兜底开关：博客无设备 token 时是否仍走 chat-server 广播 */
    @Value("${hot.push.chat-fallback-enabled:true}")
    private boolean chatFallbackEnabled;

    public HotPushNotifier(RestTemplateBuilder restTemplateBuilder, FcmPushService fcmPushService) {
        this.fcmPushService = fcmPushService;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
    }

    /** 采集成功后广播一条「热点已更新」推送 */
    public void notifyUpdated(String title, String body) {
        int sent = 0;
        try {
            sent = fcmPushService.broadcast(new PushMessage(title, body, "hot", "hot_updates"));
        } catch (Exception e) {
            log.warn("FCM 热点推送失败（不影响采集）：" + e.getMessage());
        }
        if (sent > 0) {
            log.info("已直接发送热点推送：" + sent + " 台设备");
            return;
        }
        // 过渡兜底：博客暂无设备 token（App 未升级）时仍走 chat-server
        if (chatFallbackEnabled) {
            notifyViaChat(title, body);
        }
    }

    /** 回退：经 hanphone-chat 内部接口广播（过渡期用；App 全量升级后可关闭） */
    private void notifyViaChat(String title, String body) {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            log.info("博客无设备 token 且未配置 internal.api.key，跳过热点推送");
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-internal-key", internalApiKey);

            Map<String, Object> payload = new HashMap<>();
            payload.put("title", title);
            payload.put("body", body);

            String url = chatApiBaseUrl.replaceAll("/+$", "") + CHAT_PUSH_ENDPOINT;
            restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), String.class);
            log.info("已回退经 chat-server 触发热点更新推送");
        } catch (Exception e) {
            log.warn("热点推送失败（不影响采集）：" + e.getMessage());
        }
    }
}
