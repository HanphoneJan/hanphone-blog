package com.example.blog.service;

import com.example.blog.po.User;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * App 第三方登录的一次性换取码：必须一次性、随机、能取回完整会话。
 */
class OAuthExchangeCodeStoreTest {

    private static OAuthExchangeCodeStore.Payload payload(long userId) {
        User user = new User();
        user.setId(userId);
        AuthSessionService.TokenBundle bundle =
                new AuthSessionService.TokenBundle("access", new Date(), "refresh", new Date(), "sid");
        return new OAuthExchangeCodeStore.Payload(user, bundle);
    }

    private static String issue(OAuthExchangeCodeStore store, long userId) {
        OAuthExchangeCodeStore.Payload p = payload(userId);
        return store.issue(p.user(), p.bundle());
    }

    @Test
    void codeIsSingleUse() {
        OAuthExchangeCodeStore store = new OAuthExchangeCodeStore();
        String code = issue(store, 1L);

        OAuthExchangeCodeStore.Payload first = store.consume(code);
        assertNotNull(first, "第一次兑换应当成功");
        assertEquals(1L, first.user().getId());
        assertEquals("access", first.bundle().getAccessToken());
        assertEquals("refresh", first.bundle().getRefreshToken());

        assertNull(store.consume(code), "同一枚 code 不能兑换第二次");
    }

    @Test
    void codesAreUnique() {
        OAuthExchangeCodeStore store = new OAuthExchangeCodeStore();
        String a = issue(store, 1L);
        String b = issue(store, 2L);
        assertNotEquals(a, b);
        assertEquals(2L, store.consume(b).user().getId());
    }

    @Test
    void unknownOrBlankCodeReturnsNull() {
        OAuthExchangeCodeStore store = new OAuthExchangeCodeStore();
        assertNull(store.consume(null));
        assertNull(store.consume(""));
        assertNull(store.consume("   "));
        assertNull(store.consume("not-issued"));
    }
}
