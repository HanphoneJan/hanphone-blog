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
import org.springframework.http.HttpRequest;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.GZIPInputStream;

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
    /** Trending 页单次抓取的最大尝试次数（网络抖动时重试，仍失败才回退 Search）。 */
    private static final int TRENDING_MAX_ATTEMPTS = 3;
    /** 重试退避基数，第 n 次失败后等待 n * BACKOFF_MS。 */
    private static final long RETRY_BACKOFF_MS = 1500L;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${hot.github.token:}")
    private String token;

    public GithubTrendingCollector(RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(8))
                // 国内服务器直连 github.com 抖动较大：开启 gzip 后页面由 ~600KB 降到 ~50KB，
                // 读超时放宽到 60s 作为兜底，避免偶发慢速下载直接触发回退。
                .setReadTimeout(Duration.ofSeconds(60))
                .additionalInterceptors(new GzipAcceptEncodingInterceptor())
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
        List<HotItemData> out = new ArrayList<>();

        // 优先官方每日 trending（真·每日热度榜）；网络抖动时重试，多次仍失败才回退 Search
        out.addAll(fetchTrendingWithRetry());

        // 不足 LIMIT 时用 Search API 补足（按 itemKey 去重，trending 优先居前）
        if (out.size() < LIMIT) {
            try {
                Set<String> seen = new HashSet<>();
                for (HotItemData d : out) {
                    seen.add(d.itemKey());
                }
                int filled = 0;
                for (HotItemData d : fetchFromSearch()) {
                    if (out.size() >= LIMIT) {
                        break;
                    }
                    if (seen.add(d.itemKey())) {
                        out.add(d);
                        filled++;
                    }
                }
                if (filled > 0) {
                    log.info("GitHub Search 补足 " + filled + " 条");
                }
            } catch (Exception e) {
                log.warn("GitHub Search 补足失败：" + e.getMessage());
            }
        }

        // 合并后统一按位置重排名次
        List<HotItemData> ranked = new ArrayList<>(out.size());
        int rank = 1;
        for (HotItemData d : out) {
            ranked.add(new HotItemData(d.category(), d.itemKey(), d.title(), d.url(), d.author(),
                    d.tags(), d.score(), rank++, d.extra(), d.publishedAt()));
        }
        log.info("GitHub 采集完成（trending + search 合并）：" + ranked.size() + " 条");
        return ranked;
    }

    /**
     * 带重试地抓取官方 Trending。
     *
     * <p>国内服务器访问 {@code github.com} 不稳定（页面约 600KB，直连偶发 20s+），
     * 单次超时不再直接回退 Search，而是重试若干次；只有全部尝试都失败才回退。</p>
     */
    private List<HotItemData> fetchTrendingWithRetry() {
        Exception last = null;
        for (int attempt = 1; attempt <= TRENDING_MAX_ATTEMPTS; attempt++) {
            try {
                List<HotItemData> data = fetchTrending();
                log.info("GitHub Trending 采集 " + data.size() + " 条（第 " + attempt + " 次尝试）");
                return data;
            } catch (Exception e) {
                last = e;
                log.warn("GitHub Trending 抓取/解析失败（第 " + attempt + "/" + TRENDING_MAX_ATTEMPTS
                        + " 次）：" + e.getMessage());
                if (attempt < TRENDING_MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(RETRY_BACKOFF_MS * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        log.warn("GitHub Trending 多次尝试仍失败，回退 Search API："
                + (last == null ? "unknown" : last.getMessage()));
        return List.of();
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

    /**
     * 为请求加上 {@code Accept-Encoding: gzip}，并在响应声明 gzip 时解压。
     *
     * <p>GitHub Trending 页面约 600KB，未压缩时在国内服务器直连常需 16~25s，极易触发读超时；
     * 开启 gzip 后传输量降到约 50KB，通常 2s 内即可完成。</p>
     */
    static final class GzipAcceptEncodingInterceptor implements ClientHttpRequestInterceptor {

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                            ClientHttpRequestExecution execution) throws IOException {
            request.getHeaders().set(HttpHeaders.ACCEPT_ENCODING, "gzip");
            ClientHttpResponse response = execution.execute(request, body);
            String encoding = response.getHeaders().getFirst(HttpHeaders.CONTENT_ENCODING);
            if (encoding != null && encoding.toLowerCase().contains("gzip")) {
                return new GzipClientHttpResponse(response);
            }
            return response;
        }
    }

    /** 包装原始响应，将 gzip 响应体透明解压。 */
    private static final class GzipClientHttpResponse implements ClientHttpResponse {

        private final ClientHttpResponse delegate;

        GzipClientHttpResponse(ClientHttpResponse delegate) {
            this.delegate = delegate;
        }

        @Override
        public HttpStatusCode getStatusCode() throws IOException {
            return delegate.getStatusCode();
        }

        @Override
        @Deprecated
        public int getRawStatusCode() throws IOException {
            return delegate.getRawStatusCode();
        }

        @Override
        public String getStatusText() throws IOException {
            return delegate.getStatusText();
        }

        @Override
        public HttpHeaders getHeaders() {
            return delegate.getHeaders();
        }

        @Override
        public InputStream getBody() throws IOException {
            return new GZIPInputStream(delegate.getBody());
        }

        @Override
        public void close() {
            delegate.close();
        }
    }
}
