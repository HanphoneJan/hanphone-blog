package com.example.blog.hot.collector;

import com.example.blog.hot.HotSourceKeys;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
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
 * <p>主口径：抓取官方每日 Trending（{@code https://github.com/trending}，每日按当日涨星速度更新），
 * 这才是真正"每天变化"的热门榜。若页面结构变化导致解析结果过少，则自动回退到 Search API
 * （{@code created:>最近7天 + sort=stars}，口径偏"最近新建且总星数最高"，变化较慢）。</p>
 */
@Component
public class GithubTrendingCollector implements HotCollector {

    private static final Log log = LogFactory.getLog(GithubTrendingCollector.class);
    private static final int LIMIT = 25;
    private static final int RECENT_DAYS = 7;
    private static final String TRENDING_URL = "https://github.com/trending?since=daily";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${hot.github.token:}")
    private String token;

    public GithubTrendingCollector(RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(8))
                .setReadTimeout(Duration.ofSeconds(20))
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
        // 优先官方每日 trending
        try {
            List<HotItemData> trending = fetchTrending();
            if (trending.size() >= 5) {
                log.info("GitHub Trending 采集完成：" + trending.size() + " 条");
                return trending;
            }
            log.warn("GitHub Trending 解析结果过少（" + trending.size() + " 条），回退 Search API");
        } catch (Exception e) {
            log.warn("GitHub Trending 抓取/解析失败，回退 Search API：" + e.getMessage());
        }

        // 兜底：Search API
        List<HotItemData> fallback = fetchFromSearch();
        log.info("GitHub Search 采集完成：" + fallback.size() + " 条");
        return fallback;
    }

    /** 解析 github.com/trending 页面的仓库列表。 */
    private List<HotItemData> fetchTrending() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible; hanphone-insight-bot)");
        headers.setAccept(List.of(MediaType.TEXT_HTML, MediaType.ALL));

        ResponseEntity<String> resp = restTemplate.exchange(
                TRENDING_URL, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        String html = resp.getBody() == null ? "" : resp.getBody();

        Document doc = Jsoup.parse(html, "https://github.com");
        Elements rows = doc.select("article.Box-row");

        List<HotItemData> out = new ArrayList<>();
        int rank = 1;
        for (Element row : rows) {
            Element link = row.selectFirst("h2 a[href]");
            if (link == null) {
                continue;
            }
            String href = link.attr("href").trim();
            // 仅接受 /owner/repo 形式
            if (href.isEmpty() || href.charAt(0) != '/') {
                continue;
            }
            String fullName = href.substring(1);
            if (fullName.chars().filter(c -> c == '/').count() != 1) {
                continue;
            }
            int slash = fullName.indexOf('/');
            if (slash <= 0 || slash == fullName.length() - 1) {
                continue;
            }
            String owner = fullName.substring(0, slash);
            String description = text(row.selectFirst("p"));
            String language = text(row.selectFirst("[itemprop=programmingLanguage]"));
            long stars = parseCount(text(row.selectFirst("a[href$=/stargazers]")));
            long starsToday = parseStarsToday(row);

            ObjectNode extra = objectMapper.createObjectNode();
            extra.put("description", description);
            extra.put("stars", stars);
            extra.put("starsToday", starsToday);
            extra.put("language", language);
            extra.put("source", "trending");

            out.add(new HotItemData(
                    HotSourceKeys.CATEGORY_GITHUB,
                    "github:" + fullName,
                    fullName,
                    "https://github.com/" + fullName,
                    owner,
                    language,
                    (double) stars,
                    rank++,
                    extra.toString(),
                    // trending 页面不含仓库创建时间；留空让前端回退显示"采集时间"（更贴近"每日更新"）
                    null
            ));
            if (out.size() >= LIMIT) {
                break;
            }
        }
        return out;
    }

    /** 兜底：GitHub Search API（created:>最近7天 + sort=stars）。 */
    private List<HotItemData> fetchFromSearch() throws Exception {
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
            extra.put("source", "search");
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
        return out;
    }

    private long parseStarsToday(Element row) {
        for (Element el : row.select("span")) {
            String t = el.text().trim();
            if (t.endsWith("stars today") && t.length() < 40) {
                return parseCount(t.replace("stars today", ""));
            }
        }
        return 0;
    }

    private String text(Element el) {
        return el == null ? "" : el.text().trim();
    }

    private long parseCount(String s) {
        if (s == null) {
            return 0;
        }
        String digits = s.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return 0;
        }
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException e) {
            return 0;
        }
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
