package com.example.blog.interceptor;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.CurrentUserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录用户接口拦截器。
 *
 * 目前作用于收藏、通知两类接口（控制器在后续阶段加入）；与只保护 `/admin/**` 的
 * {@link TokenInterceptor} 分开：这里只要求「已登录」，不要求管理员。
 */
@Component
public class UserAuthInterceptor implements HandlerInterceptor {

    /** 解析成功后的当前用户，放入 request attribute，供控制器读取 */
    public static final String ATTR_CURRENT_USER = "currentUser";

    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    public UserAuthInterceptor(CurrentUserService currentUserService, ObjectMapper objectMapper) {
        this.currentUserService = currentUserService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler)
            throws Exception {
        // 对 OPTIONS 请求放行，用于处理跨域预检
        if ("OPTIONS".equals(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return true;
        }

        response.setCharacterEncoding("utf-8");
        response.setContentType("application/json; charset=utf-8");

        CurrentUser currentUser = currentUserService.resolve(request);
        if (currentUser == null) {
            Result<Void> body = new Result<>(false, StatusCode.LOGINERROR, "未登录或登录状态已失效，请重新登录", null);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().append(objectMapper.writeValueAsString(body));
            return false;
        }

        request.setAttribute(ATTR_CURRENT_USER, currentUser);
        return true;
    }
}
