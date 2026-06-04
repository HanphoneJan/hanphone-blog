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
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component("github")
public class GithubOAuthProvider implements OAuthProvider {

    private final UserRepository userRepository;
    private final UserService userService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final Logger logger = LoggerFactory.getLogger(GithubOAuthProvider.class);

    @Value("${GITHUB_CLIENT_ID}")
    private String clientId;

    @Value("${GITHUB_CLIENT_SECRET}")
    private String clientSecret;

    @Value("${GITHUB_REDIRECT_URI}")
    private String redirectUri;

    public GithubOAuthProvider(UserRepository userRepository,
                               UserService userService,
                               RestTemplateBuilder restTemplateBuilder,
                               ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.restTemplate = restTemplateBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public String getProviderName() {
        return "github";
    }

    @Override
    public String getProviderId(User user) {
        return user.getGithubId();
    }

    @Override
    public void setProviderId(User user, String id) {
        user.setGithubId(id);
    }

    @Override
    public String buildAuthorizationUrl() {
        return "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&scope=user:email";
    }

    @Override
    @Transactional
    public User handleCallback(String code) {
        String accessToken = exchangeCodeForToken(code);
        if (accessToken == null) {
            throw new RuntimeException("Failed to get GitHub access token");
        }

        Map<String, Object> githubUser = fetchGithubUser(accessToken);
        String githubId = String.valueOf(githubUser.get("id"));
        String login = (String) githubUser.get("login");
        String avatarUrl = (String) githubUser.get("avatar_url");
        String email = fetchGithubPrimaryEmail(accessToken);

        return matchOrCreateUser(githubId, login, avatarUrl, email);
    }

    private User matchOrCreateUser(String providerId, String nickname, String avatarUrl, String email) {
        User user = userRepository.findByGithubId(providerId);
        if (user != null) {
            user.setLastLoginTime(new Date());
            user.setUpdateTime(new Date());
            user.setAvatar(avatarUrl);
            userService.save(user);
        } else if (email != null && !email.isEmpty()) {
            user = userRepository.findByEmail(email);
            if (user != null) {
                user.setGithubId(providerId);
                user.setOauthProvider("github");
                user.setLastLoginTime(new Date());
                user.setUpdateTime(new Date());
                user.setAvatar(avatarUrl);
                userService.save(user);
                logger.info("Auto-bound GitHub ID {} to existing user {} by email match", providerId, user.getId());
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
        user.setNickname(nickname);
        user.setUsername("gh_" + providerId);
        user.setGithubId(providerId);
        user.setOauthProvider("github");
        user.setAvatar(avatarUrl);
        user.setEmail(email);
        user.setType(UserType.NORMAL.getCode());
        userService.save(user);
        return user;
    }

    private String exchangeCodeForToken(String code) {
        try {
            String url = "https://github.com/login/oauth/access_token";
            Map<String, String> body = new HashMap<>();
            body.put("client_id", clientId);
            body.put("client_secret", clientSecret);
            body.put("code", code);
            body.put("redirect_uri", redirectUri);

            String response = restTemplate.postForObject(url, body, String.class);
            if (response != null) {
                if (response.startsWith("error=")) {
                    logger.error("GitHub token exchange failed: {}", response);
                    return null;
                }
                for (String param : response.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length >= 2 && "access_token".equals(pair[0])) {
                        return pair[1];
                    }
                }
            }
            return null;
        } catch (Exception e) {
            throw new RuntimeException("Failed to exchange code for token", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchGithubUser(String accessToken) {
        try {
            String url = "https://api.github.com/user";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response =
                    restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return objectMapper.readValue(response.getBody(), Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch GitHub user", e);
        }
    }

    private String fetchGithubPrimaryEmail(String accessToken) {
        try {
            String url = "https://api.github.com/user/emails";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response =
                    restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode emails = objectMapper.readTree(response.getBody());
            for (JsonNode emailNode : emails) {
                if (emailNode.get("primary").asBoolean() && emailNode.get("verified").asBoolean()) {
                    return emailNode.get("email").asText();
                }
            }
            return null;
        } catch (Exception e) {
            logger.warn("Failed to fetch GitHub primary email, continuing without email", e);
            return null;
        }
    }
}
