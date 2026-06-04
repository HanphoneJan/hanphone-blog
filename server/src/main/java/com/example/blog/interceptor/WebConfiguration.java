package com.example.blog.interceptor;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ConcurrentTaskExecutor;
import org.springframework.web.servlet.config.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Executors;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


/**
 * Web配置：CORS、Token拦截
 */
@Configuration
public class WebConfiguration implements WebMvcConfigurer {

    private final TokenInterceptor tokenInterceptor;

    //构造方法
    public WebConfiguration(TokenInterceptor tokenInterceptor){
        this.tokenInterceptor = tokenInterceptor;
    }

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer){
        configurer.setTaskExecutor(new ConcurrentTaskExecutor(Executors.newFixedThreadPool(3)));
        configurer.setDefaultTimeout(30000);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry){
        List<String> excludePath = new ArrayList<>();
        //排除拦截，除了注册登录(此时还没token)，其他都拦截
        excludePath.add("/register");  //登录
        excludePath.add("/login");     //注册
        excludePath.add("/oauth/**");  // GitHub OAuth 回调
        excludePath.add("/user/sendCaptcha");
        excludePath.add("/static/**");  //静态资源
        excludePath.add("/assets/**");  //静态资源

        // 排除 Swagger 相关路径 (SpringDoc OpenAPI)
        excludePath.add("/swagger-ui/**");
        excludePath.add("/swagger-ui.html");
        excludePath.add("/v3/api-docs/**");
        excludePath.add("/v3/api-docs");
        excludePath.add("/webjars/**");

        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns(excludePath);
        WebMvcConfigurer.super.addInterceptors(registry);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // CORS 白名单：通过环境变量 CORS_ALLOWED_ORIGINS 配置，多个域名用逗号分隔
        // 例如: CORS_ALLOWED_ORIGINS=https://hanphone.cn,https://www.hanphone.cn,http://localhost:*,tauri://localhost
        // http://localhost:* 匹配 Tauri 桌面应用的随机端口（dangerousUseHttpScheme 模式）
        // tauri://localhost 匹配 Tauri 默认 scheme
        String allowedOrigins = System.getProperty("CORS_ALLOWED_ORIGINS");
        if (allowedOrigins == null || allowedOrigins.trim().isEmpty()) {
            allowedOrigins = "http://localhost:8080,http://localhost:3000";
        }
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .toArray(String[]::new);
        registry.addMapping("/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}