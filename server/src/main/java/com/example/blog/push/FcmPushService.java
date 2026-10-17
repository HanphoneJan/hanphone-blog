package com.example.blog.push;

import com.example.blog.dao.DeviceTokenRepository;
import com.example.blog.po.DeviceToken;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.PrivateKey;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Firebase Cloud Messaging（HTTP v1 REST）发送器，自实现以支持代理。
 *
 * <p>为什么不用现成 SDK：FCM 的 Java/其它 SDK 多走 HTTP/2 直连 {@code fcm.googleapis.com}，
 * 国内服务器不可达且无法走代理。这里改用 {@link HttpClient}（强制 HTTP/1.1）+
 * {@code ProxySelector}（{@code fcm.proxy}）实现。</p>
 *
 * <p>凭证：{@code fcm.service-account} 指向 Firebase 服务账号 JSON（project_id / private_key /
 * client_email / token_uri）。用其私钥签 RS256 JWT 换取 access token（缓存至过期），
 * 再向 {@code projects/{project_id}/messages:send} 发送。未配置时整体关闭、静默无操作。</p>
 */
@Service
public class FcmPushService {

    private static final Log log = LogFactory.getLog(FcmPushService.class);
    private static final String FCM_SEND_URL = "https://fcm.googleapis.com/v1/projects/%s/messages:send";

    private final DeviceTokenRepository deviceTokenRepository;
    private final ObjectMapper objectMapper;

    @Value("${fcm.service-account:}")
    private String serviceAccountPath;

    @Value("${fcm.proxy:}")
    private String proxyUrl;

    private volatile ServiceAccount account;
    private volatile boolean loadAttempted;
    private volatile HttpClient httpClient;
    private volatile String accessToken;
    private volatile long accessTokenExpEpochMs;

    public FcmPushService(DeviceTokenRepository deviceTokenRepository, ObjectMapper objectMapper) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.objectMapper = objectMapper;
    }

    /** 是否可用（服务账号已成功加载） */
    public boolean isEnabled() {
        return loadAccount() != null;
    }

    /**
     * 广播给全部已上报设备；返回成功条数。
     * 未配置/未加载服务账号、无设备、取 token 失败时返回 0，不抛异常。
     */
    public int broadcast(PushMessage message) {
        ServiceAccount sa = loadAccount();
        if (sa == null) {
            return 0;
        }
        List<String> tokens;
        try {
            tokens = deviceTokenRepository.findAll().stream()
                    .map(DeviceToken::getToken)
                    .filter(t -> t != null && !t.isBlank())
                    .toList();
        } catch (Exception e) {
            log.warn("读取设备 token 失败：" + e.getMessage());
            return 0;
        }
        if (tokens.isEmpty()) {
            return 0;
        }
        String token = accessToken(sa);
        if (token == null) {
            return 0;
        }

        int sent = 0;
        List<String> invalid = new ArrayList<>();
        for (String deviceToken : tokens) {
            SendResult r = sendOne(sa, token, deviceToken, message);
            if (r == SendResult.OK) {
                sent++;
            } else if (r == SendResult.INVALID) {
                invalid.add(deviceToken);
            }
        }
        if (!invalid.isEmpty()) {
            try {
                deviceTokenRepository.deleteByTokenIn(invalid);
                log.info("清理失效 FCM token " + invalid.size() + " 个");
            } catch (Exception e) {
                log.warn("清理失效 FCM token 失败：" + e.getMessage());
            }
        }
        return sent;
    }

    // ==================== 凭证加载 ====================

    private ServiceAccount loadAccount() {
        ServiceAccount loaded = account;
        if (loaded != null) {
            return loaded;
        }
        if (loadAttempted) {
            return null;
        }
        synchronized (this) {
            if (account != null) {
                return account;
            }
            if (loadAttempted) {
                return null;
            }
            loadAttempted = true;
            if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
                log.info("未配置 fcm.service-account，博客侧 FCM 推送关闭");
                return null;
            }
            try {
                JsonNode node = objectMapper.readTree(Files.readString(Path.of(serviceAccountPath)));
                String projectId = node.path("project_id").asText(null);
                String clientEmail = node.path("client_email").asText(null);
                String privateKeyPem = node.path("private_key").asText(null);
                String tokenUri = node.path("token_uri").asText(FcmCredentials.DEFAULT_TOKEN_URI);
                if (projectId == null || clientEmail == null || privateKeyPem == null) {
                    log.error("FCM 服务账号 JSON 缺少必要字段，推送关闭");
                    return null;
                }
                PrivateKey privateKey = FcmCredentials.parsePrivateKey(privateKeyPem);
                httpClient = buildHttpClient();
                account = new ServiceAccount(projectId, clientEmail, tokenUri, privateKey);
                log.info("FCM 服务账号已加载：" + projectId
                        + "（" + (proxyUrl == null || proxyUrl.isBlank() ? "直连" : "经代理 " + proxyUrl) + "）");
                return account;
            } catch (Exception e) {
                log.error("加载 FCM 服务账号失败，推送关闭：" + e.getMessage());
                return null;
            }
        }
    }

    private HttpClient buildHttpClient() {
        HttpClient.Builder builder = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10));
        if (proxyUrl != null && !proxyUrl.isBlank()) {
            try {
                URI uri = URI.create(proxyUrl.contains("://") ? proxyUrl.trim() : "http://" + proxyUrl.trim());
                int port = uri.getPort() > 0 ? uri.getPort() : 7890;
                builder.proxy(ProxySelector.of(new InetSocketAddress(uri.getHost(), port)));
            } catch (Exception e) {
                log.warn("解析 fcm.proxy 失败，改为直连：" + e.getMessage());
            }
        }
        return builder.build();
    }

    // ==================== access token ====================

    private String accessToken(ServiceAccount sa) {
        String cached = accessToken;
        if (cached != null && System.currentTimeMillis() < accessTokenExpEpochMs) {
            return cached;
        }
        synchronized (this) {
            if (accessToken != null && System.currentTimeMillis() < accessTokenExpEpochMs) {
                return accessToken;
            }
            try {
                String assertion = FcmCredentials.buildJwt(sa.clientEmail(), sa.tokenUri(), sa.privateKey(), objectMapper);
                String form = "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="
                        + URLEncoder.encode(assertion, StandardCharsets.UTF_8);
                HttpRequest request = HttpRequest.newBuilder(URI.create(sa.tokenUri()))
                        .timeout(Duration.ofSeconds(20))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    log.error("获取 FCM access token 失败 HTTP " + response.statusCode()
                            + "：" + truncate(response.body(), 200));
                    return null;
                }
                JsonNode node = objectMapper.readTree(response.body());
                String token = node.path("access_token").asText(null);
                long expiresIn = node.path("expires_in").asLong(3600);
                if (token == null) {
                    log.error("FCM access token 响应缺少 access_token");
                    return null;
                }
                accessToken = token;
                accessTokenExpEpochMs = System.currentTimeMillis() + Math.max(60, expiresIn - 120) * 1000L;
                return token;
            } catch (Exception e) {
                log.error("获取 FCM access token 异常：" + e.getMessage());
                return null;
            }
        }
    }

    // ==================== 发送 ====================

    private SendResult sendOne(ServiceAccount sa, String accessTokenValue, String deviceToken, PushMessage msg) {
        try {
            ObjectNode message = objectMapper.createObjectNode();
            message.put("token", deviceToken);
            ObjectNode notification = message.putObject("notification");
            notification.put("title", msg.title());
            notification.put("body", msg.body());
            ObjectNode data = message.putObject("data");
            if (msg.type() != null) {
                data.put("type", msg.type());
            }
            ObjectNode android = message.putObject("android");
            android.put("priority", "high");
            ObjectNode androidNotification = android.putObject("notification");
            if (msg.channelId() != null) {
                androidNotification.put("channelId", msg.channelId());
            }
            androidNotification.put("sound", "default");

            ObjectNode root = objectMapper.createObjectNode();
            root.set("message", message);

            HttpRequest request = HttpRequest.newBuilder(URI.create(String.format(FCM_SEND_URL, sa.projectId())))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessTokenValue)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(root)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            if (code == 200) {
                return SendResult.OK;
            }
            // 404 NOT_FOUND（UNREGISTERED）/ 400 INVALID_ARGUMENT → token 失效
            if (code == 404 || code == 400) {
                return SendResult.INVALID;
            }
            log.warn("FCM 发送失败 HTTP " + code + "：" + truncate(response.body(), 200));
            return SendResult.ERROR;
        } catch (Exception e) {
            log.warn("FCM 发送异常：" + e.getMessage());
            return SendResult.ERROR;
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private enum SendResult {
        OK, INVALID, ERROR
    }

    private record ServiceAccount(String projectId, String clientEmail, String tokenUri, PrivateKey privateKey) {
    }
}
