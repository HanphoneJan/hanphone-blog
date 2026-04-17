package com.example.blog.filter;

import org.apache.commons.text.StringEscapeUtils;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;

/**
 * XSS 请求包装器：对请求参数和请求体中的 HTML 进行转义
 * 仅对 JSON 请求体中的 String 值进行 HTML 转义，防止存储型 XSS
 */
public class XssHttpServletRequestWrapper extends HttpServletRequestWrapper {

    public XssHttpServletRequestWrapper(HttpServletRequest request) {
        super(request);
    }

    @Override
    public String[] getParameterValues(String name) {
        String[] values = super.getParameterValues(name);
        if (values == null) {
            return null;
        }
        String[] escapedValues = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            escapedValues[i] = escapeHtml(values[i]);
        }
        return escapedValues;
    }

    @Override
    public String getParameter(String name) {
        String value = super.getParameter(name);
        return escapeHtml(value);
    }

    @Override
    public String getHeader(String name) {
        String value = super.getHeader(name);
        return escapeHtml(value);
    }

    /**
     * HTML 实体转义，防止 XSS 攻击
     */
    private String escapeHtml(String input) {
        if (input == null) {
            return null;
        }
        return StringEscapeUtils.escapeHtml4(input);
    }
}
