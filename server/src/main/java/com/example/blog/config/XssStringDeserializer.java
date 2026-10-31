package com.example.blog.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import org.apache.commons.text.StringEscapeUtils;
import org.springframework.boot.jackson.JsonComponent;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;

/**
 * Jackson String 反序列化器：对公开接口的 JSON body 中的 String 值做 HTML 转义
 *
 * XssHttpServletRequestWrapper 只能拦截 getParameter/getHeader，
 * @RequestBody 的 JSON 反序列化由 Jackson 直接从 InputStream 读取，
 * 完全绕过 ServletRequestWrapper 的 getParameter 系列方法。
 * 通过注册此全局反序列化器，在 Jackson 反序列化阶段就完成 HTML 转义。
 *
 * <p><b>管理端与内部 MCP 接口必须跳过转义。</b> 正文是 Markdown，里面本来就有
 * {@code <分支名>} 这类尖括号、{@code <div>} 这类内嵌 HTML，一旦被转义成
 * {@code &lt;分支名&gt;}，代码块里会原样显示成实体（CommonMark 不在代码块里
 * 解析字符引用），博客上就是一片 {@code &lt;}。这两个入口分别由 TokenInterceptor
 * （JWT）与 InternalKeyVerifier（X-Internal-Key）把关，只有博主自己能写，不需要
 * 这层防护；公开的评论/留言入口仍然照旧转义。
 */
@JsonComponent
public class XssStringDeserializer extends JsonDeserializer<String> {

    /** 管理端（/admin/**）与内部 MCP（/internal/**）是可信写入，正文不转义 */
    private static boolean isTrustedWrite() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servletAttributes)) {
            return false;
        }
        String uri = servletAttributes.getRequest().getRequestURI();
        return uri.contains("/admin/") || uri.contains("/internal/");
    }

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getText();
        if (value == null) {
            return null;
        }
        if (isTrustedWrite()) {
            return value;
        }
        return StringEscapeUtils.escapeHtml4(value);
    }
}
