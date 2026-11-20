package com.example.blog.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

/**
 * 外链头像镜像：Google（lh3.googleusercontent.com）与 GitHub（avatars.githubusercontent.com）
 * 的头像 CDN 在国内直连不可用（实测直接请求超时），把它们的 URL 原样写进 `t_user.avatar`
 * 会让 App / 网页一直显示占位图。
 *
 * 登录时把这类头像下载下来（走 GOOGLE_OAUTH_PROXY_*，缺省回退 HOT_PROXY），
 * 再经 `x-internal-key` 上传到本站文件服务（admin-file，namespace=blog/user/avatars），
 * 库里只保存 `hanphone.top` 的地址。
 *
 * 失败时返回 null，调用方应保留原头像或走默认头像，**不要**再写入被墙的外链。
 */
@Component
public class ExternalAvatarService {

    private static final Logger logger = LoggerFactory.getLogger(ExternalAvatarService.class);

    /** 需要镜像的头像域名后缀（其余外链保持原样，避免任意 URL 抓取） */
    private static final List<String> MIRROR_HOSTS = List.of(
            "googleusercontent.com",
            "githubusercontent.com",
            "avatars.githubusercontent.com"
    );

    private static final String NAMESPACE = "blog/user/avatars";
    private static final String UPLOAD_PATH = "/upload";

    private final RestTemplate downloader;
    private final RestTemplate uploader;
    private final ObjectMapper objectMapper;

    @Value("${file.service.base-url:https://hanphone.top}")
    private String fileServiceBaseUrl;

    @Value("${internal.api.key:}")
    private String internalApiKey;

    public ExternalAvatarService(RestTemplateBuilder restTemplateBuilder,
                                 ObjectMapper objectMapper,
                                 @Value("${GOOGLE_OAUTH_PROXY_HOST:}") String proxyHost,
                                 @Value("${GOOGLE_OAUTH_PROXY_PORT:0}") int proxyPort,
                                 @Value("${HOT_PROXY:}") String fallbackProxy) {
        this.objectMapper = objectMapper;

        // 下载走代理（与 Google OAuth 用同一套配置）；上传是本机/本站域名，直连即可
        InetSocketAddress address = resolveProxy(proxyHost, proxyPort, fallbackProxy);
        RestTemplateBuilder downloadBuilder = restTemplateBuilder;
        if (address != null) {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, address);
            org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                    new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setProxy(proxy);
            factory.setConnectTimeout(Duration.ofSeconds(5));
            factory.setReadTimeout(Duration.ofSeconds(15));
            downloadBuilder = downloadBuilder.requestFactory(() -> factory);
            logger.info("外链头像下载使用代理 {}:{}", address.getHostString(), address.getPort());
        }
        this.downloader = downloadBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
        this.uploader = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
    }

    /** 代理解析与 GoogleOAuthProvider 保持一致：优先专用代理，缺省回退 HOT_PROXY */
    private static InetSocketAddress resolveProxy(String host, int port, String hotProxy) {
        if (host != null && !host.isEmpty() && port > 0) {
            return new InetSocketAddress(host, port);
        }
        if (hotProxy == null || hotProxy.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(hotProxy.contains("://") ? hotProxy : "http://" + hotProxy);
            String h = uri.getHost();
            int p = uri.getPort() > 0 ? uri.getPort() : ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80);
            return h == null ? null : new InetSocketAddress(h, p);
        } catch (Exception e) {
            logger.warn("HOT_PROXY 无法解析为代理地址: {}", hotProxy);
            return null;
        }
    }

    /** 该 URL 是否是国内不可直连、需要镜像的外链头像 */
    public boolean needsMirror(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        try {
            String host = URI.create(url.trim()).getHost();
            if (host == null) {
                return false;
            }
            String h = host.toLowerCase(Locale.ROOT);
            return MIRROR_HOSTS.stream().anyMatch(h::endsWith);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 下载外链头像并转存到本站文件服务。
     *
     * @return 本站 URL；下载/上传失败返回 null（调用方不要回退成外链）
     */
    public String mirror(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        if (internalApiKey == null || internalApiKey.isBlank()) {
            logger.warn("未配置 INTERNAL_API_KEY，无法把外链头像转存到文件服务");
            return null;
        }
        byte[] bytes = download(biggerGoogleAvatar(url));
        if (bytes == null || bytes.length == 0) {
            bytes = download(url);
        }
        if (bytes == null || bytes.length == 0) {
            logger.warn("外链头像下载失败: {}", url);
            return null;
        }
        return upload(bytes);
    }

    /** Google 头像 URL 自带尺寸（=s96-c）；换成 512 取更清晰的版本，失败再回退原图 */
    private String biggerGoogleAvatar(String url) {
        if (!url.contains("googleusercontent.com")) {
            return url;
        }
        return url.replaceAll("=s\\d+(-c)?$", "=s512-c");
    }

    private byte[] download(String url) {
        try {
            return downloader.getForObject(url, byte[].class);
        } catch (Exception e) {
            logger.info("头像下载失败({}): {}", e.getClass().getSimpleName(), e.getMessage());
            return null;
        }
    }

    private String upload(byte[] bytes) {
        String ext = detectExtension(bytes);
        try {
            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(mediaTypeFor(ext));
            ByteArrayResource resource = new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return "oauth-" + System.currentTimeMillis() + "-" + Math.abs(java.util.UUID.randomUUID().hashCode()) + "." + ext;
                }
            };
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new HttpEntity<>(resource, partHeaders));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("x-internal-key", internalApiKey);

            String base = fileServiceBaseUrl.replaceAll("/+$", "");
            String response = uploader.postForObject(
                    base + UPLOAD_PATH + "?namespace=" + NAMESPACE,
                    new HttpEntity<>(body, headers),
                    String.class);
            JsonNode node = response == null ? null : objectMapper.readTree(response);
            String mirrored = node == null ? null : node.path("url").asText(null);
            if (mirrored == null || mirrored.isBlank()) {
                logger.warn("外链头像转存失败，文件服务响应: {}", response);
                return null;
            }
            logger.info("外链头像已转存: {}", mirrored);
            return mirrored;
        } catch (Exception e) {
            logger.warn("外链头像上传异常: {}", e.getMessage());
            return null;
        }
    }

    /** 按文件头判断扩展名（文件服务按扩展名返回 Content-Type） */
    private String detectExtension(byte[] b) {
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "png";
        }
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8) {
            return "jpg";
        }
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F') {
            return "gif";
        }
        if (b.length >= 12 && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "webp";
        }
        return "jpg";
    }

    private MediaType mediaTypeFor(String ext) {
        return switch (ext) {
            case "png" -> MediaType.IMAGE_PNG;
            case "gif" -> MediaType.IMAGE_GIF;
            case "webp" -> MediaType.parseMediaType("image/webp");
            default -> MediaType.IMAGE_JPEG;
        };
    }
}
