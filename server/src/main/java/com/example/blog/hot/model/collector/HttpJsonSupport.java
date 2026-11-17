package com.example.blog.hot.model.collector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.URI;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 采集器共享的 HTTP / JSON 工具：统一超时、UA 与日期解析。
 *
 * <p>若配置了 {@code hot.proxy}（如 {@code http://127.0.0.1:7890}），
 * 采集器可调用 {@link #getJsonViaProxy} 走该代理（用于服务器侧代理访问被墙信源）；
 * `*.hf.space`（Hugging Face Spaces）会**自动**走代理。所有请求遇到网络抖动 / 5xx 时
 * 自动重试 3 次（2026-11 MTEB / VBench 的 `UnknownHostException` 即 DNS 抖动导致）。</p>
 */
@Component
public class HttpJsonSupport {

    /** 网络抖动的重试次数（含首次） */
    private static final int MAX_ATTEMPTS = 3;
    private static final DateTimeFormatter MONTH_YEAR = DateTimeFormatter.ofPattern("MMM yyyy, HH:mm", java.util.Locale.ENGLISH);
    private static final DateTimeFormatter MONTH_YEAR_SHORT = DateTimeFormatter.ofPattern("MMM yyyy", java.util.Locale.ENGLISH);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${hot.proxy:}")
    private String proxyUrl;

    private volatile RestTemplate proxyRestTemplate;

    public HttpJsonSupport(RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();
        this.objectMapper = objectMapper;
    }

    public JsonNode getJson(String url, Map<String, String> headers) throws Exception {
        return objectMapper.readTree(getRaw(url, headers, List.of(MediaType.APPLICATION_JSON)));
    }

    /** 走代理（若配置了 hot.proxy）获取 JSON；未配置时等同 {@link #getJson} */
    public JsonNode getJsonViaProxy(String url, Map<String, String> headers) throws Exception {
        RestTemplate rt = proxyTemplate();
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));
        httpHeaders.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (headers != null) {
            headers.forEach(httpHeaders::set);
        }
        // 用 URI 直连，避免 RestTemplate 对已编码查询串（如 %2F）二次编码导致上游 500
        ResponseEntity<String> resp = exchange(
                rt, URI.create(url), HttpMethod.GET, new HttpEntity<>(httpHeaders), String.class);
        return objectMapper.readTree(resp.getBody());
    }

    private RestTemplate proxyTemplate() {
        if (proxyUrl == null || proxyUrl.isBlank()) {
            return restTemplate;
        }
        RestTemplate local = proxyRestTemplate;
        if (local == null) {
            synchronized (this) {
                local = proxyRestTemplate;
                if (local == null) {
                    local = buildWithProxy(proxyUrl);
                    proxyRestTemplate = local;
                }
            }
        }
        return local;
    }

    private RestTemplate buildWithProxy(String url) {
        URI uri = URI.create(url.contains("://") ? url : "http://" + url);
        int port = uri.getPort() > 0 ? uri.getPort() : 7890;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setProxy(new Proxy(Proxy.Type.HTTP, new InetSocketAddress(uri.getHost(), port)));
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(30000);
        return new RestTemplate(factory);
    }

    /** 直接以 URI 发起请求，避免 URL 二次编码 */
    public JsonNode getJson(java.net.URI uri, Map<String, String> headers) throws Exception {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));
        httpHeaders.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (headers != null) {
            headers.forEach(httpHeaders::set);
        }
        ResponseEntity<String> resp = exchange(
                templateFor(uri), uri, HttpMethod.GET, new HttpEntity<>(httpHeaders), String.class);
        return objectMapper.readTree(resp.getBody());
    }

    public JsonNode readTree(String json) throws Exception {
        return objectMapper.readTree(json);
    }

    public JsonNode postJson(String url, String jsonBody, Map<String, String> headers) throws Exception {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setContentType(MediaType.APPLICATION_JSON);
        httpHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));
        httpHeaders.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (headers != null) {
            headers.forEach(httpHeaders::set);
        }
        URI uri = URI.create(url);
        ResponseEntity<String> resp = exchange(
                templateFor(uri), uri, HttpMethod.POST, new HttpEntity<>(jsonBody, httpHeaders), String.class);
        return objectMapper.readTree(resp.getBody());
    }

    public String getRaw(String url, Map<String, String> headers, List<MediaType> accept) {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setAccept(accept);
        httpHeaders.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (headers != null) {
            headers.forEach(httpHeaders::set);
        }
        URI uri = URI.create(url);
        ResponseEntity<String> resp = exchange(
                templateFor(uri), uri, HttpMethod.GET, new HttpEntity<>(httpHeaders), String.class);
        return resp.getBody();
    }

    /**
     * `*.hf.space`（Hugging Face Spaces，如 MTEB / VBench 的榜单后端）不走 HF 镜像，
     * 国内直连经常 DNS 失败或卡到 30s 读超时；配置了代理时优先走代理。
     */
    private RestTemplate templateFor(URI uri) {
        String host = uri.getHost();
        boolean hfSpace = host != null && (host.equals("hf.space") || host.endsWith(".hf.space"));
        return hfSpace ? proxyTemplate() : restTemplate;
    }

    /**
     * 统一请求入口：网络抖动（DNS/连接/读超时、5xx）重试 3 次，退避 1.5s、3s。
     * 代理模板失败时再退回直连试一遍——代理挂了不至于让 hf.space 全灭。
     */
    private <T> ResponseEntity<T> exchange(
            RestTemplate template,
            URI uri,
            HttpMethod method,
            HttpEntity<?> entity,
            Class<T> responseType
    ) {
        try {
            return exchangeWithRetry(template, uri, method, entity, responseType);
        } catch (ResourceAccessException e) {
            if (template != restTemplate) {
                return exchangeWithRetry(restTemplate, uri, method, entity, responseType);
            }
            throw e;
        }
    }

    private <T> ResponseEntity<T> exchangeWithRetry(
            RestTemplate template,
            URI uri,
            HttpMethod method,
            HttpEntity<?> entity,
            Class<T> responseType
    ) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return template.exchange(uri, method, entity, responseType);
            } catch (ResourceAccessException | HttpServerErrorException e) {
                last = e;
                if (attempt < MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(1500L * attempt);
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        throw last != null ? last : new IllegalStateException("请求失败：" + uri);
    }

    /** 解析 ISO 8601（可含时区）为 Date，失败返回 null */
    public Date parseIso(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Date.from(OffsetDateTime.parse(value).toInstant());
        } catch (Exception e) {
            try {
                return Date.from(java.time.Instant.parse(value));
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    /** 解析 ISO 日期或日期时间（可含时区），失败返回 null */
    public Date parseDate(String value) {
        Date iso = parseIso(value);
        if (iso != null) {
            return iso;
        }
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Date.from(java.time.LocalDate.parse(value.trim())
                    .atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        } catch (Exception e) {
            return null;
        }
    }

    /** 解析 "Apr 2025" / "Apr 2025, 12:00" 之类的月份日期，失败返回 null */
    public Date parseMonthYear(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Date.from(java.time.YearMonth.parse(value, MONTH_YEAR_SHORT)
                    .atDay(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return Date.from(java.time.LocalDateTime.parse(value, MONTH_YEAR)
                    .toInstant(java.time.ZoneOffset.UTC));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
