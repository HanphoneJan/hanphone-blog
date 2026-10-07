package com.example.blog.hot.model.collector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 采集器共享的 HTTP / JSON 工具：统一超时、UA 与日期解析。
 */
@Component
public class HttpJsonSupport {

    private static final DateTimeFormatter MONTH_YEAR = DateTimeFormatter.ofPattern("MMM yyyy, HH:mm", java.util.Locale.ENGLISH);
    private static final DateTimeFormatter MONTH_YEAR_SHORT = DateTimeFormatter.ofPattern("MMM yyyy", java.util.Locale.ENGLISH);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

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

    /** 直接以 URI 发起请求，避免 URL 二次编码 */
    public JsonNode getJson(java.net.URI uri, Map<String, String> headers) throws Exception {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));
        httpHeaders.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (headers != null) {
            headers.forEach(httpHeaders::set);
        }
        ResponseEntity<String> resp = restTemplate.exchange(
                uri, HttpMethod.GET, new HttpEntity<>(httpHeaders), String.class);
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
        ResponseEntity<String> resp = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(jsonBody, httpHeaders), String.class);
        return objectMapper.readTree(resp.getBody());
    }

    public String getRaw(String url, Map<String, String> headers, List<MediaType> accept) {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setAccept(accept);
        httpHeaders.set(HttpHeaders.USER_AGENT, "hanphone-insight-bot");
        if (headers != null) {
            headers.forEach(httpHeaders::set);
        }
        ResponseEntity<String> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(httpHeaders), String.class);
        return resp.getBody();
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
