package com.example.blog.filter;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 安全响应头过滤器（历史名 `XssFilter`，已不再改写请求内容）。
 *
 * <p><b>为什么不再「输入转义」</b>：这里曾经包一层 `XssHttpServletRequestWrapper`，
 * 对 `getParameter` / `getHeader` 做 HTML 转义；另有一个全局 Jackson 反序列化器
 * （原 `config/XssStringDeserializer`）对每个 JSON body 的 String 做 `escapeHtml4`。
 * 那是典型的 escape-on-input 反模式，代价实测如下：
 * <ul>
 *   <li>友链头像 `https://q1.qlogo.cn/g?b=qq&amp;nk=…`（库里存的字面量就是 `&amp;`）
 *       → 客户端拿去做 HTTP 请求直接 400，头像全空；</li>
 *   <li>带签名的 URL（OSS/COS 的 `&` 参数）被转义后签名失效；</li>
 *   <li>请求头被转义 → 内部密钥只能用字母数字，`Referer` 比对也会被破坏（见 mcp-server/README）；</li>
 *   <li>转义不幂等，写-读-写会叠成 `&amp;amp;`，只能靠客户端无限解码兜底。</li>
 * </ul>
 *
 * <p><b>现在的分工</b>：数据库与 JSON 出参一律**原值**；转义只发生在输出到 HTML 的那一刻 ——
 * 前端 React/JSX 文本默认转义、RSS 路由自己 escape、Android 用 Text 渲染、
 * 文库 HTML 预览在客户端过 DOMPurify。富文本只对博主可写的正文放行内联 HTML。
 *
 * <p>本过滤器因此只保留安全响应头（防嗅探 / 防嵌套 / HSTS / 权限策略），
 * 这也是真正对浏览器生效的那一层。整改记录见 server/TECHNICAL_DOCUMENT.md「安全」一节。
 */
@Component
@Order(1)
public class XssFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 对 OPTIONS 预检请求直接放行
        if ("OPTIONS".equals(httpRequest.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        httpResponse.setHeader("X-Frame-Options", "SAMEORIGIN");
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        // 请求原样传递：不改 parameter / header / body
        chain.doFilter(request, response);
    }
}
