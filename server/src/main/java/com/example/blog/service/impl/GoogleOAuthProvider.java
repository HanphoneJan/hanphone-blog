package com.example.blog.service.impl;

import com.example.blog.dao.UserRepository;
import com.example.blog.enums.UserType;
import com.example.blog.po.User;
import com.example.blog.service.OAuthProvider;
import com.example.blog.service.UserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import jakarta.transaction.Transactional;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.time.Duration;
import java.util.*;

@Component("google")
public class GoogleOAuthProvider implements OAuthProvider {

    private final UserRepository userRepository;
    private final UserService userService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final Logger logger = LoggerFactory.getLogger(GoogleOAuthProvider.class);

    @Value("${GOOGLE_CLIENT_ID}")
    private String clientId;

    @Value("${GOOGLE_CLIENT_SECRET}")
    private String clientSecret;

    @Value("${GOOGLE_REDIRECT_URI}")
    private String redirectUri;

    public GoogleOAuthProvider(UserRepository userRepository,
                               UserService userService,
                               RestTemplateBuilder restTemplateBuilder,
                               ObjectMapper objectMapper,
                               @Value("${GOOGLE_OAUTH_PROXY_HOST:}") String proxyHost,
                               @Value("${GOOGLE_OAUTH_PROXY_PORT:0}") int proxyPort,
                               @Value("${HOT_PROXY:}") String fallbackProxy) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.objectMapper = objectMapper;

        // 注意：代理参数必须由构造器注入。写成 @Value 字段在构造器里读，
        // 字段此时还没注入（恒为 null/0），代理永远不生效——这里踩过。
        java.net.InetSocketAddress address = resolveProxy(proxyHost, proxyPort, fallbackProxy);
        RestTemplateBuilder builder = restTemplateBuilder;
        if (address != null) {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, address);
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setProxy(proxy);
            factory.setConnectTimeout(Duration.ofSeconds(5));
            factory.setReadTimeout(Duration.ofSeconds(10));
            builder = builder.requestFactory(() -> factory);
            logger.info("Google OAuth using proxy {}:{}", address.getHostString(), address.getPort());
        }
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * 解析出站代理：优先 `GOOGLE_OAUTH_PROXY_*`，否则复用 `HOT_PROXY`（同一台服务器上的
     * mihomo，国内直连 Google 会 000）。两者都没有则直连。
     */
    private static java.net.InetSocketAddress resolveProxy(String host, int port, String hotProxy) {
        if (host != null && !host.isEmpty() && port > 0) {
            return new java.net.InetSocketAddress(host, port);
        }
        if (hotProxy == null || hotProxy.isBlank()) {
            return null;
        }
        try {
            java.net.URI uri = java.net.URI.create(hotProxy.contains("://") ? hotProxy : "http://" + hotProxy);
            String h = uri.getHost();
            int p = uri.getPort() > 0 ? uri.getPort() : ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80);
            return h == null ? null : new java.net.InetSocketAddress(h, p);
        } catch (Exception e) {
            logger.warn("HOT_PROXY 无法解析为代理地址: {}", hotProxy);
            return null;
        }
    }

    @Override
    public String getProviderName() {
        return "google";
    }

    @Override
    public String getProviderId(User user) {
        return user.getGoogleId();
    }

    @Override
    public void setProviderId(User user, String id) {
        user.setGoogleId(id);
    }

    @Override
    public String buildAuthorizationUrl(String state) {
        return "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&response_type=code"
                + "&scope=openid%20email%20profile"
                + (state == null || state.isBlank()
                    ? ""
                    : "&state=" + java.net.URLEncoder.encode(state, java.nio.charset.StandardCharsets.UTF_8));
    }

    @Override
    @Transactional
    public User handleCallback(String code) {
        // 1. 交换 access_token + id_token
        JsonNode tokenResponse = exchangeCodeForToken(code);
        String accessToken = tokenResponse.get("access_token").asText();

        // 2. 获取用户信息（OpenID Connect userinfo 端点）
        JsonNode userInfo = fetchUserInfo(accessToken);
        String googleId = userInfo.get("sub").asText();
        String name = userInfo.has("name") ? userInfo.get("name").asText() : null;
        String picture = userInfo.has("picture") ? userInfo.get("picture").asText() : null;
        String email = userInfo.has("email") ? userInfo.get("email").asText() : null;
        // Google OAuth 返回的 email_verified 为 true 时才使用
        if (email != null && (!userInfo.has("email_verified") || !userInfo.get("email_verified").asBoolean())) {
            email = null;
        }

        return matchOrCreateUser(googleId, name, picture, email);
    }

    @Override
    @Transactional
    public User handleIdToken(String idToken) {
        // 浏览器端 Google Sign-In 返回的 ID Token（JWT）。
        //
        // 必须是「Google 校验过签名」的结论才能用来建会话。曾经这里只做 JWT.decode
        // （不验签、不校验 aud），任何人拼一个 payload 就能以任意 sub / email 登录，
        // 而且会被邮箱合并逻辑绑定到管理员账号——等于公开的账号接管入口。
        // 现在交给 Google 的 tokeninfo 端点验签 + 校验 iss/exp，再自己核对 aud。
        JsonNode claims = verifyIdTokenWithGoogle(idToken);
        if (!clientId.equals(claims.path("aud").asText())) {
            throw new RuntimeException("Google ID token 不属于本应用（aud 不匹配）");
        }
        String googleId = claims.path("sub").asText("");
        if (googleId.isBlank()) {
            throw new RuntimeException("Google ID token 缺少 sub");
        }
        String name = claims.hasNonNull("name") ? claims.get("name").asText() : null;
        String picture = claims.hasNonNull("picture") ? claims.get("picture").asText() : null;
        String email = claims.hasNonNull("email") ? claims.get("email").asText() : null;
        boolean emailVerified = claims.path("email_verified").asBoolean(false);
        if (email != null && !emailVerified) {
            email = null;
        }

        logger.info("Google ID token verified for sub={}, email={}", googleId, email);
        return matchOrCreateUser(googleId, name, picture, email);
    }

    /** 调 Google tokeninfo 验签：签名 / iss / exp 由 Google 判定，失败会抛异常 */
    private JsonNode verifyIdTokenWithGoogle(String idToken) {
        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token="
                    + java.net.URLEncoder.encode(idToken, java.nio.charset.StandardCharsets.UTF_8);
            String body = restTemplate.getForObject(url, String.class);
            JsonNode claims = objectMapper.readTree(body);
            if (claims == null || !claims.hasNonNull("sub")) {
                throw new RuntimeException("Google ID token 校验失败：响应缺少 sub");
            }
            return claims;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Google ID token 校验失败", e);
        }
    }

    private User matchOrCreateUser(String providerId, String nickname, String avatarUrl, String email) {
        User user = userRepository.findByGoogleId(providerId);
        if (user != null) {
            user.setLastLoginTime(new Date());
            user.setUpdateTime(new Date());
            if (avatarUrl != null) user.setAvatar(avatarUrl);
            userService.save(user);
        } else if (email != null && !email.isEmpty()) {
            user = userRepository.findByEmail(email);
            if (user != null) {
                user.setGoogleId(providerId);
                user.setOauthProvider("google");
                user.setLastLoginTime(new Date());
                user.setUpdateTime(new Date());
                if (avatarUrl != null) user.setAvatar(avatarUrl);
                userService.save(user);
                logger.info("Auto-bound Google ID {} to existing user {} by email match", providerId, user.getId());
            } else {
                user = createNewUser(providerId, nickname, avatarUrl, email);
            }
        } else {
            user = createNewUser(providerId, nickname, avatarUrl, null);
        }
        return user;
    }

    private User createNewUser(String providerId, String nickname, String avatarUrl, String email) {
        User user = new User();
        user.setNickname(nickname != null ? nickname : "Google用户");
        user.setUsername("goog_" + providerId);
        user.setGoogleId(providerId);
        user.setOauthProvider("google");
        user.setAvatar(avatarUrl);
        user.setEmail(email);
        user.setType(UserType.NORMAL.getCode());
        userService.save(user);
        return user;
    }

    private JsonNode exchangeCodeForToken(String code) {
        try {
            String url = "https://oauth2.googleapis.com/token";
            Map<String, String> body = new HashMap<>();
            body.put("client_id", clientId);
            body.put("client_secret", clientSecret);
            body.put("code", code);
            body.put("grant_type", "authorization_code");
            body.put("redirect_uri", redirectUri);

            String response = restTemplate.postForObject(url, body, String.class);
            return objectMapper.readTree(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to exchange code for Google token", e);
        }
    }

    private JsonNode fetchUserInfo(String accessToken) {
        try {
            String url = "https://openidconnect.googleapis.com/v1/userinfo";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response =
                    restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch Google user info", e);
        }
    }
}
