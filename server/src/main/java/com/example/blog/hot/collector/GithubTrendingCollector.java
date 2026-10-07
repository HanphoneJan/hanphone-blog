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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * GitHub 热门仓库采集器。
 *
 * <p>GitHub 没有官方 trending API，这里用 Search API 的
 * {@code created:>最近7天 + sort=stars} 作为「新星飙升」口径。</p>
 */
@Component
public class GithubTrendingCollector implements HotCollector {

    private static final Log log = LogFactory.getLog(GithubTrendingCollector.class);
    private static final int LIMIT = 25;
    private static final int RECENT_DAYS = 7;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${hot.github.token:}")
    private String token;

    public GithubTrendingCollector(RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(8))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return HotSourceKeys.GITHUB;
    }

    @Override
    public String category() {
        return HotSourceKeys.CATEGORY_GITHUB;
    }

    @Override
    public String displayName() {
        return "GitHub 热门仓库";
    }

    @Override
    public String sourceUrl() {
        return "https://github.com/trending";
    }

    @Override
    public List<HotItemData> fetch() throws Exception {
        String since = LocalDate.now().minusDays(RECENT_DAYS).toString();
        String url = "https://api.github.com/search/repositories?q=created:>" + since
                + "&sort=stars&order=desc&per_page=" + LIMIT;

        JsonNode root = fetchJson(url);
        JsonNode items = root.path("items");

        List<HotItemData> out = new ArrayList<>();
        int rank = 1;
        for (JsonNode repo : items) {
            String fullName = repo.path("full_name").asText(null);
            if (fullName == null || fullName.isBlank()) {
                continue;
            }

            ObjectNode extra = objectMapper.createObjectNode();
            extra.put("description", repo.path("description").asText(""));
            extra.put("stars", repo.path("stargazers_count").asLong());
            extra.put("forks", repo.path("forks_count").asLong());
            extra.put("watchers", repo.path("watchers_count").asLong());
            extra.put("language", repo.path("language").asText(""));
            extra.put("htmlUrl", repo.path("html_url").asText(""));
            ArrayNode topics = extra.putArray("topics");
            if (repo.path("topics").isArray()) {
                repo.path("topics").forEach(t -> topics.add(t.asText()));
            }

            out.add(new HotItemData(
                    HotSourceKeys.CATEGORY_GITHUB,
                    "github:" + fullName,
                    fullName,
                    repo.path("html_url").asText("https://github.com/" + fullName),
                    repo.path("owner").path("login").asText(""),
                    repo.path("language").asText(""),
                    repo.path("stargazers_count").asDouble(0),
                    rank++,
                    extra.toString(),
                    parseDate(repo.path("created_at").asText(null))
            ));
        }
        log.info("GitHub 采集完成：" + out.size() + " 条");
        return out;
    }

    private JsonNode fetchJson(String url) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.parseMediaType("application/vnd.github+json")));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
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
