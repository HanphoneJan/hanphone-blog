package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.User;
import com.example.blog.service.AuthSessionService;
import com.example.blog.service.OAuthExchangeCodeStore;
import com.example.blog.service.OAuthProvider;
import com.example.blog.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Date;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * App 第三方登录：`state=app` 只回一次性 code（不回 token），
 * 浏览器先落到 https 中转页，页面再转 `hanphone://`（夸克等浏览器会拦 302 → scheme）。
 */
class OAuthControllerAppFlowTest {

    private static final String APP_REDIRECT = "hanphone://oauth/callback";
    private static final String RETURN_PAGE = "https://hanphone.cn/api/oauth/app/return";

    private OAuthController controller;

    /** 只认 state、回调固定返回一个用户的假 provider */
    private static class FakeProvider implements OAuthProvider {
        @Override
        public String buildAuthorizationUrl(String state) {
            return "https://example.test/authorize?state=" + state;
        }

        @Override
        public User handleCallback(String code) {
            User user = new User();
            user.setId(42L);
            user.setNickname("tester");
            user.setUsername("gh_42");
            user.setType("0");
            return user;
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
    }

    @BeforeEach
    void setUp() {
        UserService userService = mock(UserService.class);
        when(userService.clearSensitiveFields(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthSessionService sessions = mock(AuthSessionService.class);
        when(sessions.create(any(), any(), any(), any())).thenReturn(new AuthSessionService.TokenBundle(
                "access-token", new Date(System.currentTimeMillis() + 1_800_000),
                "refresh-token", new Date(System.currentTimeMillis() + 7_776_000_000L), "sid-1"));

        controller = new OAuthController(
                Map.of("github", new FakeProvider()),
                userService,
                new ObjectMapper(),
                sessions,
                new OAuthExchangeCodeStore());
        ReflectionTestUtils.setField(controller, "frontendUrl", "https://hanphone.cn");
        ReflectionTestUtils.setField(controller, "appRedirect", APP_REDIRECT);
        ReflectionTestUtils.setField(controller, "appReturnUrl", "");
    }

    @Test
    void appFlowReturnsOneTimeCodeViaReturnPage() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.callback("github", "gh-code", "app", null, new MockHttpServletRequest(), response);

        String location = response.getRedirectedUrl();
        assertNotNull(location);
        assertTrue(location.startsWith(RETURN_PAGE + "?code="), "浏览器先落中转页：" + location);
        assertFalse(location.contains("token="), "token 不能出现在 URL 里");

        String code = UriComponentsBuilder.fromUriString(location).build().getQueryParams().getFirst("code");
        assertNotNull(code);

        // 中转页必须把同一个 code 交给自定义 scheme（按钮 + 自动尝试）
        String html = controller.appReturnPage(code, "github", null, new MockHttpServletResponse());
        assertTrue(html.contains("hanphone://oauth/callback?code=" + code + "&amp;provider=github"), html);
        assertFalse(html.contains("access-token"));

        Result<Map<String, Object>> first = controller.exchange(Map.of("code", code));
        assertTrue(first.isFlag());
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) first.getData();
        assertEquals("access-token", data.get("token"));
        assertEquals("refresh-token", data.get("refreshToken"));
        assertEquals("sid-1", data.get("sid"));
        assertEquals("tester", ((User) data.get("user")).getNickname());

        // 一次性：同一枚 code 不能再换一次
        Result<Map<String, Object>> second = controller.exchange(Map.of("code", code));
        assertFalse(second.isFlag());
    }

    @Test
    void appFlowCancelledGoesBackToReturnPage() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.callback("github", null, "app", "access_denied", new MockHttpServletRequest(), response);

        assertEquals(RETURN_PAGE + "?error=access_denied", response.getRedirectedUrl());

        String html = controller.appReturnPage(null, null, "access_denied", new MockHttpServletResponse());
        assertTrue(html.contains("已取消授权"));
        assertTrue(html.contains("hanphone://oauth/callback?error=access_denied"));
        assertFalse(html.contains("location.replace"), "失败页不要自动跳转，交给用户决定");
    }

    @Test
    void webFlowStillRedirectsToFrontendCallback() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.callback("github", null, null, "access_denied", new MockHttpServletRequest(), response);

        assertEquals("https://hanphone.cn/oauth/callback?error=access_denied", response.getRedirectedUrl());
    }

    @Test
    void unknownStateIsRejected() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.authorize("github", "https://evil.test", response);

        assertEquals(400, response.getStatus());
        assertNull(response.getRedirectedUrl());
    }

    @Test
    void appStateIsForwardedToProvider() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.authorize("github", "app", response);

        assertEquals("https://example.test/authorize?state=app", response.getRedirectedUrl());
    }

    @Test
    void unknownProviderInCallbackIsRejected() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.callback("gitlab", "x", "app", null, new MockHttpServletRequest(), response);

        assertEquals(RETURN_PAGE + "?error=invalid_provider", response.getRedirectedUrl());
    }
}
