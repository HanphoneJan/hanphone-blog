package com.example.blog.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import org.apache.commons.text.StringEscapeUtils;
import org.springframework.boot.jackson.JsonComponent;

import java.io.IOException;

/**
 * Jackson String 反序列化器：对所有 JSON body 中的 String 值做 HTML 转义
 *
 * XssHttpServletRequestWrapper 只能拦截 getParameter/getHeader，
 * @RequestBody 的 JSON 反序列化由 Jackson 直接从 InputStream 读取，
 * 完全绕过 ServletRequestWrapper 的 getParameter 系列方法。
 * 通过注册此全局反序列化器，在 Jackson 反序列化阶段就完成 HTML 转义。
 */
@JsonComponent
public class XssStringDeserializer extends JsonDeserializer<String> {

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getText();
        if (value == null) {
            return null;
        }
        return StringEscapeUtils.escapeHtml4(value);
    }
}
