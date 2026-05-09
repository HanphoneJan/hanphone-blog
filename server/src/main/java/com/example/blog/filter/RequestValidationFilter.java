package com.example.blog.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.Enumeration;

/**
 * 请求验证过滤器：防御超长 URL、超长参数和恶意请求
 * 优先级设置为最高，确保在其他过滤器之前执行
 */
@Component
@Order(0)
public class RequestValidationFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RequestValidationFilter.class);

    // URL 长度限制（字符数）
    private static final int MAX_URL_LENGTH = 2048;

    // 查询参数最大长度
    private static final int MAX_QUERY_LENGTH = 100;

    // 单个参数值最大长度
    private static final int MAX_PARAM_VALUE_LENGTH = 1000;

    // 最大参数数量
    private static final int MAX_PARAM_COUNT = 50;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 1. 验证 URL 长度
        String requestUri = httpRequest.getRequestURI();
        String queryString = httpRequest.getQueryString();
        String fullUrl = httpRequest.getRequestURL().toString();

        if (fullUrl.length() > MAX_URL_LENGTH) {
            logger.warn("Request URL too long: {} chars, URI: {}", fullUrl.length(), requestUri);
            httpResponse.setStatus(HttpServletResponse.SC_REQUEST_URI_TOO_LONG);
            httpResponse.getWriter().write("{\"success\":false,\"code\":\"414\",\"msg\":\"Request URI too long\"}");
            return;
        }

        // 2. 验证查询字符串长度
        if (queryString != null && queryString.length() > MAX_QUERY_LENGTH * 10) {
            logger.warn("Query string too long: {} chars, URI: {}", queryString.length(), requestUri);
            httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            httpResponse.getWriter().write("{\"success\":false,\"code\":\"400\",\"msg\":\"Query string too long\"}");
            return;
        }

        // 3. 验证参数数量和参数值长度
        Enumeration<String> parameterNames = httpRequest.getParameterNames();
        int paramCount = 0;
        while (parameterNames.hasMoreElements()) {
            paramCount++;
            if (paramCount > MAX_PARAM_COUNT) {
                logger.warn("Too many parameters: {}, URI: {}", paramCount, requestUri);
                httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                httpResponse.getWriter().write("{\"success\":false,\"code\":\"400\",\"msg\":\"Too many parameters\"}");
                return;
            }

            String paramName = parameterNames.nextElement();
            String[] paramValues = httpRequest.getParameterValues(paramName);

            if (paramValues != null) {
                for (String paramValue : paramValues) {
                    // 特别验证搜索参数
                    if ("query".equals(paramName) || "q".equals(paramName)) {
                        if (paramValue != null && paramValue.length() > MAX_QUERY_LENGTH) {
                            logger.warn("Search query too long: {} chars, URI: {}", paramValue.length(), requestUri);
                            httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                            httpResponse.getWriter().write("{\"success\":false,\"code\":\"400\",\"msg\":\"Search query too long, max " + MAX_QUERY_LENGTH + " chars\"}");
                            return;
                        }
                    }

                    // 通用参数长度验证
                    if (paramValue != null && paramValue.length() > MAX_PARAM_VALUE_LENGTH) {
                        logger.warn("Parameter value too long: {} = {} chars, URI: {}",
                                paramName, paramValue.length(), requestUri);
                        httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        httpResponse.getWriter().write("{\"success\":false,\"code\":\"400\",\"msg\":\"Parameter value too long\"}");
                        return;
                    }
                }
            }
        }

        // 4. 验证 PathVariable 长度（通过 URI 判断）
        if (requestUri.length() > MAX_URL_LENGTH) {
            logger.warn("Request URI too long: {} chars", requestUri.length());
            httpResponse.setStatus(HttpServletResponse.SC_REQUEST_URI_TOO_LONG);
            httpResponse.getWriter().write("{\"success\":false,\"code\":\"414\",\"msg\":\"Request URI too long\"}");
            return;
        }

        // 继续过滤链
        chain.doFilter(request, response);
    }
}
