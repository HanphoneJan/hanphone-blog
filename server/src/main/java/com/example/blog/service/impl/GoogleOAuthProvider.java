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

    @Value("${GOOGLE_OAUTH_PROXY_HOST:}")
    private String proxyHost;

    @Value("${GOOGLE_OAUTH_PROXY_PORT:0}")
    private int proxyPort;

    public GoogleOAuthProvider(UserRepository userRepository,
                               UserService userService,
                               RestTemplateBuilder restTemplateBuilder,
                               ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.objectMapper = objectMapper;

        RestTemplateBuilder builder = restTemplateBuilder;
        if (proxyHost != null && !proxyHost.isEmpty() && proxyPort > 0) {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setProxy(proxy);
            builder = builder.requestFactory(() -> factory);
            logger.info("Google OAuth using proxy {}:{}", proxyHost, proxyPort);
        }
        this.restTemplate = builder.build();
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
    public String buildAuthorizationUrl() {
        return "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&response_type=code"
                + "&scope=openid%20email%20profile";
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
        // 浏览器端 Google Sign-In 返回的 ID Token（JWT）
        // 解码 Payload 获取用户信息，无需调 Google API
        try {
            com.auth0.jwt.interfaces.DecodedJWT jwt = com.auth0.jwt.JWT.decode(idToken);
            String googleId = jwt.getSubject(); // sub
            String name = jwt.getClaim("name").asString();
            String picture = jwt.getClaim("picture").asString();
            String email = jwt.getClaim("email").asString();
            Boolean emailVerified = jwt.getClaim("email_verified").asBoolean();

            if (!Boolean.TRUE.equals(emailVerified)) {
                email = null;
            }

            logger.info("Google ID token verified for sub={}, email={}", googleId, email);
            return matchOrCreateUser(googleId, name, picture, email);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decode Google ID token", e);
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
