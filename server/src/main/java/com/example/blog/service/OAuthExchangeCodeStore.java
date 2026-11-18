package com.example.blog.service;

import com.example.blog.po.User;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

/**
 * 第三方登录的一次性换取码（App 登录用）。
 *
 * 为什么不把 token 直接拼进自定义 scheme 的回跳 URL：`hanphone://` 不是系统独占的，
 * 任何 App 都能注册同一个 scheme，URL 里的凭证可能被别的应用抢到。所以回调只带一枚
 * 随机码，App 回到前台后再用自己的网络请求（`POST /oauth/app/exchange`）换会话。
 *
 * - 一次性：`consume` 后立即失效（即使兑换方后续处理失败）
 * - 2 分钟过期：够浏览器跳回 App，不够被慢慢猜
 * - 进程内存储：与站点统计缓存一样依赖单实例部署（见 server/DEPLOYMENT.md）
 */
@Component
public class OAuthExchangeCodeStore {

    /** 一次授权换出来的完整会话 + 用户信息（App 兑换时原样返回） */
    public record Payload(User user, AuthSessionService.TokenBundle bundle) {
    }

    private final Cache<String, Payload> codes = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(2))
            .maximumSize(10_000)
            .build();

    private final SecureRandom random = new SecureRandom();

    public String issue(User user, AuthSessionService.TokenBundle bundle) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        codes.put(code, new Payload(user, bundle));
        return code;
    }

    /** 兑换并作废；不存在 / 过期 / 已经用过都返回 null */
    public Payload consume(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        Payload payload = codes.getIfPresent(code);
        if (payload != null) {
            codes.invalidate(code);
        }
        return payload;
    }
}
