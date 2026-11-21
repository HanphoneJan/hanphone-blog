package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.service.AuthSessionService;
import com.example.blog.service.OAuthExchangeCodeStore;
import com.example.blog.service.OAuthProvider;
import com.example.blog.service.UserService;
import com.example.blog.util.ClientIpUtil;
import com.example.blog.util.DeviceNameUtil;
import com.example.blog.util.TokenUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 第三方登录（GitHub / Google）。
 *
 * 两条回跳路径，靠授权 URL 里的 `state` 区分（第三方原样回传）：
 * - 网页：`state` 为空 → 回 `FRONTEND_URL/oauth/callback?token=…`，由 BFF 把 refresh 写进 Cookie；
 * - 客户端（Android）：`state=app` → 回 `APP_OAUTH_REDIRECT`（自定义 scheme），
 *   只带一枚一次性 code，App 再 `POST /oauth/app/exchange` 换成完整会话。
 *   这样 token 不出现在 URL 里 —— 自定义 scheme 谁都能注册，URL 会被别的 App 看到。
 */
@RestController
@RequestMapping("/oauth")
public class OAuthController {

    /** 授权请求允许的 state：null = 网页流程，app = 客户端流程（白名单，避免被当成任意跳转） */
    private static final String STATE_APP = "app";

    private final Map<String, OAuthProvider> providers;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final AuthSessionService authSessionService;
    private final OAuthExchangeCodeStore exchangeCodes;

    private static final Logger logger = LoggerFactory.getLogger(OAuthController.class);

    @Value("${FRONTEND_URL:https://hanphone.cn}")
    private String frontendUrl;

    /** 客户端登录完成后的深链（Android Manifest 里注册的 intent-filter） */
    @Value("${APP_OAUTH_REDIRECT:hanphone://oauth/callback}")
    private String appRedirect;

    /**
     * 浏览器回跳的中转页地址（https，必填可达）。
     *
     * 为什么不直接 302 到 `hanphone://`：国内浏览器（实测夸克）会**静默忽略**
     * 非用户触发的外部 scheme 跳转 —— 用户停在白页，以为登录失败。
     * 所以先落到这个 https 页面，页面里再尝试跳 App，并给一个可点的按钮
     * （用户点击的跳转浏览器才放行，最多弹一次「是否打开外部应用」）。
     * 留空时按 `FRONTEND_URL + /api/oauth/app/return` 推导。
     */
    @Value("${APP_OAUTH_RETURN_URL:}")
    private String appReturnUrl;

    public OAuthController(Map<String, OAuthProvider> providers,
                           UserService userService,
                           ObjectMapper objectMapper,
                           AuthSessionService authSessionService,
                           OAuthExchangeCodeStore exchangeCodes) {
        this.providers = providers;
        this.userService = userService;
        this.objectMapper = objectMapper;
        this.authSessionService = authSessionService;
        this.exchangeCodes = exchangeCodes;
    }

    /**
     * 发起 OAuth 授权（通配路由）
     */
    @GetMapping("/{provider}/authorize")
    public void authorize(@PathVariable String provider,
                          @RequestParam(value = "state", required = false) String state,
                          jakarta.servlet.http.HttpServletResponse response) throws IOException {
        if (state != null && !state.isBlank() && !STATE_APP.equals(state)) {
            response.sendError(400, "Unknown OAuth state: " + state);
            return;
        }
        OAuthProvider p = providers.get(provider);
        if (p == null) {
            response.sendError(400, "Unknown OAuth provider: " + provider);
            return;
        }
        response.sendRedirect(p.buildAuthorizationUrl(state));
    }

    /**
     * OAuth 回调（通配路由）
     */
    @GetMapping("/{provider}/callback")
    public void callback(@PathVariable String provider,
                         @RequestParam(value = "code", required = false) String code,
                         @RequestParam(value = "state", required = false) String state,
                         @RequestParam(value = "error", required = false) String error,
                         HttpServletRequest request,
                         jakarta.servlet.http.HttpServletResponse response) throws IOException {

        boolean appFlow = STATE_APP.equals(state);

        if (error != null || code == null) {
            redirectBack(response, appFlow, "error=access_denied");
            return;
        }

        OAuthProvider p = providers.get(provider);
        if (p == null) {
            redirectBack(response, appFlow, "error=invalid_provider");
            return;
        }

        try {
            User user = p.handleCallback(code);

            if (appFlow) {
                // 客户端流程：建完整会话（含 refresh），URL 里只放一次性 code
                AuthSessionService.TokenBundle bundle = authSessionService.create(
                        user,
                        DeviceNameUtil.resolve(request),
                        request.getHeader("User-Agent"),
                        ClientIpUtil.getClientIp(request)
                );
                userService.clearSensitiveFields(user);
                String exchangeCode = exchangeCodes.issue(user, bundle);
                redirectBack(response, true, "code=" + exchangeCode + "&provider=" + provider);
                return;
            }

            String token = TokenUtil.sign(user).getToken();

            Long userId = TokenUtil.getUserId(token);
            if (userId == null) {
                logger.error("Failed to extract userId from OAuth token");
                redirectBack(response, false, "error=server_error");
                return;
            }

            userService.clearSensitiveFields(user);
            String userInfoJson = objectMapper.writeValueAsString(user);
            String userInfoEncoded = java.net.URLEncoder.encode(userInfoJson, StandardCharsets.UTF_8);

            String providerId = p.getProviderId(user);
            String providerIdParam = providerId != null ? "&providerId=" + providerId : "";

            redirectBack(response, false,
                    "token=" + token
                            + "&userInfo=" + userInfoEncoded
                            + "&provider=" + provider
                            + providerIdParam);
        } catch (Exception e) {
            logger.error("OAuth callback failed for provider: {}", provider, e);
            redirectBack(response, appFlow, "error=server_error");
        }
    }

    /**
     * 客户端用一次性 code 换会话（公开接口，无需先登录）。
     *
     * 返回结构与 `POST /login` 一致，客户端可复用同一套保存逻辑。
     */
    @PostMapping("/app/exchange")
    public Result<Map<String, Object>> exchange(@RequestBody(required = false) Map<String, String> body) {
        OAuthExchangeCodeStore.Payload payload = exchangeCodes.consume(body == null ? null : body.get("code"));
        if (payload == null) {
            return new Result<>(false, StatusCode.ERROR, "登录凭证无效或已过期，请重新登录", null);
        }

        AuthSessionService.TokenBundle bundle = payload.bundle();
        Map<String, Object> info = new HashMap<>();
        info.put("user", payload.user());
        info.put("token", bundle.getAccessToken());
        info.put("expire", bundle.getAccessExpire());
        info.put("refreshToken", bundle.getRefreshToken());
        info.put("refreshExpire", bundle.getRefreshExpire());
        info.put("sid", bundle.getSid());

        return new Result<>(true, StatusCode.OK, "登录成功", info);
    }

    /**
     * 浏览器端 ID Token 验证（无需服务端调第三方 API）
     */
    @PostMapping("/{provider}/verify")
    public Result<Map<String, Object>> verify(@PathVariable String provider,
                                              @RequestBody Map<String, String> body,
                                              jakarta.servlet.http.HttpServletRequest httpRequest) {
        OAuthProvider p = providers.get(provider);
        if (p == null) {
            return new Result<>(false, StatusCode.ERROR, "Unknown OAuth provider: " + provider, null);
        }

        String credential = body.get("credential");
        if (credential == null || credential.isEmpty()) {
            return new Result<>(false, StatusCode.ERROR, "credential不能为空", null);
        }

        try {
            User user = p.handleIdToken(credential);
            AuthSessionService.TokenBundle bundle = authSessionService.create(
                    user,
                    DeviceNameUtil.resolve(httpRequest),
                    httpRequest.getHeader("User-Agent"),
                    ClientIpUtil.getClientIp(httpRequest)
            );
            userService.clearSensitiveFields(user);

            Map<String, Object> info = new HashMap<>();
            info.put("user", user);
            info.put("token", bundle.getAccessToken());
            info.put("expire", bundle.getAccessExpire());
            info.put("refreshToken", bundle.getRefreshToken());
            info.put("refreshExpire", bundle.getRefreshExpire());
            info.put("sid", bundle.getSid());

            return new Result<>(true, StatusCode.OK, "登录成功", info);
        } catch (UnsupportedOperationException e) {
            return new Result<>(false, StatusCode.ERROR, "该平台不支持此登录方式", null);
        } catch (Exception e) {
            logger.error("ID token verify failed for provider: {}", provider, e);
            return new Result<>(false, StatusCode.ERROR, "登录失败", null);
        }
    }

    // ------------------------------------------------------------------

    /**
     * 客户端授权完成后的转向页（浏览器打开）。
     *
     * 页面只做两件事：自动尝试 `hanphone://oauth/callback`，以及给一个用户可点的按钮
     * （浏览器只在用户手势里放行自定义 scheme）。code 是一次性的、2 分钟过期。
     */
    @GetMapping(value = "/app/return", produces = MediaType.TEXT_HTML_VALUE)
    public String appReturnPage(@RequestParam(value = "code", required = false) String code,
                                @RequestParam(value = "provider", required = false) String provider,
                                @RequestParam(value = "error", required = false) String error,
                                HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");

        String safeProvider = "google".equals(provider) ? "google" : "github";
        String target;
        if (code != null && !code.isBlank()) {
            target = appRedirect + "?code=" + urlEncode(code) + "&provider=" + safeProvider;
        } else {
            target = appRedirect + "?error=" + urlEncode(error == null ? "server_error" : error);
        }

        boolean failed = code == null || code.isBlank();
        String title = failed
                ? ("access_denied".equals(error) ? "已取消授权" : "授权未完成")
                : "授权完成";
        String hint = failed
                ? "你可以关闭这个页面，回到 App 重新登录。"
                : "正在返回「云林有风」… 如果没有任何反应，请点下面的按钮。";

        return "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
                + "<meta name=\"robots\" content=\"noindex\">"
                + "<title>" + title + "</title>"
                + "<style>"
                + "body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;"
                + "background:#f2f6fb;color:#1b2734;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',"
                + "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif}"
                + ".card{width:min(88vw,420px);background:#fff;border-radius:16px;padding:28px 24px;"
                + "box-shadow:0 10px 30px rgba(24,52,90,.10);text-align:center}"
                + "h1{font-size:20px;margin:0 0 8px}"
                + "p{margin:0 0 20px;color:#5b6b7d;font-size:14px}"
                + "a.btn{display:block;padding:14px 20px;border-radius:12px;background:#2C7BE5;color:#fff;"
                + "text-decoration:none;font-weight:600}"
                + ".tip{margin-top:16px;font-size:12px;color:#8794a5}"
                + "</style></head><body><div class=\"card\">"
                + "<h1>" + title + "</h1><p>" + hint + "</p>"
                + "<a class=\"btn\" id=\"open\" href=\"" + htmlEscape(target) + "\">打开「云林有风」</a>"
                + "<div class=\"tip\">未安装 App？请到 hanphone.cn 下载。</div>"
                + "</div>"
                + (failed ? "" : "<script>setTimeout(function(){try{location.replace("
                        + "document.getElementById('open').href)}catch(e){}},200);</script>")
                + "</body></html>";
    }

    /**
     * 回跳：网页回前端回调页，客户端回中转页（再由页面转 `hanphone://`）。
     */
    private void redirectBack(HttpServletResponse response, boolean appFlow, String query)
            throws IOException {
        String base = appFlow ? appReturnPageUrl() : frontendUrl + "/oauth/callback";
        response.sendRedirect(base + (base.contains("?") ? "&" : "?") + query);
    }

    private String appReturnPageUrl() {
        return (appReturnUrl == null || appReturnUrl.isBlank())
                ? frontendUrl + "/api/oauth/app/return"
                : appReturnUrl;
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String htmlEscape(String value) {
        return value.replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
