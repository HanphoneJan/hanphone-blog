package com.hanphone.blog

import com.hanphone.blog.util.DeepLink
import com.hanphone.blog.util.DeepLinkTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * 深链解析回归：只接受 https + hanphone.cn；query 忽略、fragment 取随笔 id；
 * http / 其他域名 / 非法 URL / OAuth 回跳都不能误判。
 */
class DeepLinkTest {

    @Test
    fun articleWithAndWithoutTrailingSlash() {
        assertEquals(DeepLinkTarget.Article(123), DeepLink.parse("https://hanphone.cn/blog/123/"))
        assertEquals(DeepLinkTarget.Article(123), DeepLink.parse("https://hanphone.cn/blog/123"))
    }

    @Test
    fun queryStringIsIgnored() {
        assertEquals(
            DeepLinkTarget.Article(7),
            DeepLink.parse("https://hanphone.cn/blog/7/?utm_source=wechat&from=timeline")
        )
        assertEquals(DeepLinkTarget.Docs, DeepLink.parse("https://hanphone.cn/docs/?q=android"))
    }

    @Test
    fun essayIdFromFragment() {
        assertEquals(DeepLinkTarget.Essay(42), DeepLink.parse("https://hanphone.cn/essays/#42"))
        assertEquals(DeepLinkTarget.Essay(42), DeepLink.parse("https://hanphone.cn/essays#42"))
        // 网页版分享链接的形态（路径里带 id）也认
        assertEquals(DeepLinkTarget.Essay(42), DeepLink.parse("https://hanphone.cn/essays/42"))
    }

    @Test
    fun essaysWithoutIdFallsBackToTab() {
        assertEquals(DeepLinkTarget.Essays, DeepLink.parse("https://hanphone.cn/essays/"))
        assertEquals(DeepLinkTarget.Essays, DeepLink.parse("https://hanphone.cn/essays"))
        // fragment 不是数字（如 #comments）时同样回列表
        assertEquals(DeepLinkTarget.Essays, DeepLink.parse("https://hanphone.cn/essays/#comments"))
    }

    @Test
    fun docsDeepLinkOnlyOpensList() {
        assertEquals(DeepLinkTarget.Docs, DeepLink.parse("https://hanphone.cn/docs"))
        assertEquals(DeepLinkTarget.Docs, DeepLink.parse("https://hanphone.cn/docs/"))
        assertEquals(DeepLinkTarget.Docs, DeepLink.parse("https://hanphone.cn/docs/寒枫的作品集/《刑天》.docx"))
    }

    @Test
    fun httpIsRejected() {
        // Manifest 只注册 https，http 不该被当成深链（浏览器会 301 到 https）
        assertNull(DeepLink.parse("http://hanphone.cn/blog/1/"))
    }

    @Test
    fun otherHostsAndSchemesAreRejected() {
        assertNull(DeepLink.parse("https://example.com/blog/1/"))
        assertNull(DeepLink.parse("https://www.hanphone.cn/blog/1/"))
        assertNull(DeepLink.parse("https://hanphone.cn.evil.com/blog/1/"))
        assertNull(DeepLink.parse("hanphone://blog/1"))
    }

    @Test
    fun invalidOrIncompleteUrlsAreRejected() {
        assertNull(DeepLink.parse(null))
        assertNull(DeepLink.parse(""))
        assertNull(DeepLink.parse("   "))
        assertNull(DeepLink.parse("not a url"))
        assertNull(DeepLink.parse("/blog/1/"))
        assertNull(DeepLink.parse("https://hanphone.cn/"))
        assertNull(DeepLink.parse("https://hanphone.cn/blog/"))
        assertNull(DeepLink.parse("https://hanphone.cn/blog/abc/"))
        assertNull(DeepLink.parse("https://hanphone.cn/unknown/1"))
    }

    @Test
    fun oauthCallbackIsNotMistakenForDeepLink() {
        // 第三方登录回跳必须先被 OAuthLogin.isCallback 拦下，这里再确认解析器也不会误判
        assertNull(DeepLink.parse("https://hanphone.cn/api/oauth/app/return?code=abc"))
        assertNull(DeepLink.parse("hanphone://oauth/callback?code=abc&provider=github"))
    }
}
