package com.example.blog.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.*;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spi.service.contexts.SecurityContext;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Swagger API 文档配置
 */
@Configuration
@EnableSwagger2
public class SwaggerConfig {

    /**
     * 创建 Swagger Docket
     */
    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                // API 信息
                .apiInfo(apiInfo())
                // 选择哪些接口生成文档
                .select()
                // 扫描的包路径
                .apis(RequestHandlerSelectors.basePackage("com.example.blog.web"))
                // 扫描所有路径
                .paths(PathSelectors.any())
                .build()
                // 安全上下文配置（JWT）
                .securitySchemes(securitySchemes())
                .securityContexts(securityContexts());
    }

    /**
     * API 基本信息
     */
    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("Hanphone Blog API 文档")
                .description("基于 Spring Boot 的个人博客后端系统 API 文档")
                .contact(new Contact("Hanphone", "https://github.com/HanphoneJan", "Janhizian@163.com"))
                .version("2.1.0")
                .build();
    }

    /**
     * 安全方案配置
     */
    private List<ApiKey> securitySchemes() {
        List<ApiKey> apiKeyList = new ArrayList<>();
        apiKeyList.add(new ApiKey("Authorization", "Authorization", "header"));
        return apiKeyList;
    }

    /**
     * 安全上下文配置
     */
    private List<SecurityContext> securityContexts() {
        List<SecurityContext> securityContexts = new ArrayList<>();
        securityContexts.add(
                SecurityContext.builder()
                        .securityReferences(defaultAuth())
                        // 对所有路径应用认证（需要排除的路径可以使用 PathSelectors 配置）
                        .forPaths(PathSelectors.any())
                        .build()
        );
        return securityContexts;
    }

    /**
     * 默认的安全引用
     */
    private List<SecurityReference> defaultAuth() {
        AuthorizationScope authorizationScope = new AuthorizationScope("global", "accessEverything");
        AuthorizationScope[] authorizationScopes = new AuthorizationScope[1];
        authorizationScopes[0] = authorizationScope;
        return Collections.singletonList(new SecurityReference("Authorization", authorizationScopes));
    }
}
