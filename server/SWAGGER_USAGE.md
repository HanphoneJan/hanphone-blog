# SpringDoc OpenAPI 使用指南

SpringDoc OpenAPI 3 注解使用说明。

> [返回后端文档](./README.md)

---

## 简介

本项目使用 **springdoc-openapi-starter-webmvc-ui** 自动生成 OpenAPI 3 文档。无需手动编写 YAML/JSON 规范，通过代码注解即可生成 API 文档。

启动项目后，访问以下地址：

- **Swagger UI**: http://localhost:8090/swagger-ui/index.html
- **OpenAPI JSON**: http://localhost:8090/v3/api-docs

---

## 依赖

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

---

## 配置

配置类位于 `com.example.blog.config.SwaggerConfig`：

```java
@Configuration
public class SwaggerConfig {

    private static final String SECURITY_SCHEME_NAME = "Authorization";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, securityScheme()));
    }

    private Info apiInfo() {
        return new Info()
                .title("Hanphone Blog API 文档")
                .description("基于 Spring Boot 的个人博客后端系统 API 文档")
                .version("3.0.0");
    }

    private SecurityScheme securityScheme() {
        return new SecurityScheme()
                .name(SECURITY_SCHEME_NAME)
                .type(SecurityScheme.Type.APIKEY)
                .in(SecurityScheme.In.HEADER)
                .scheme("bearer")
                .bearerFormat("JWT");
    }
}
```

---

## 🔐 JWT 认证

由于项目使用 JWT 进行认证，需要在 Swagger UI 中配置 Authorization：

1. 点击页面右上角的 **Authorize** 按钮
2. 在弹出框中输入 JWT Token（格式：`Bearer your_token_here`）
3. 点击 **Authorize** 确认
4. 之后的所有请求都会自动带上 Token

**注意**：Token 需要先通过登录接口获取。

---

## 📝 常用注解

### Controller 类注解

使用 `@Tag` 为 Controller 分组：

```java
@Tag(name = "用户管理", description = "用户注册、登录等接口")
@RestController
@RequestMapping("/user")
public class UserController {
    // ...
}
```

### 接口方法注解

使用 `@Operation` 描述 API 操作：

```java
@Operation(
    summary = "用户登录",
    description = "使用用户名和密码登录"
)
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "登录成功"),
    @ApiResponse(responseCode = "401", description = "认证失败")
})
@PostMapping("/login")
public Result login(@RequestBody User user) {
    // ...
}
```

### 参数注解

#### 路径参数

```java
@GetMapping("/blog/{id}")
@Operation(summary = "获取博客详情")
public Result getBlog(
    @Parameter(name = "id", description = "博客ID", required = true)
    @PathVariable Long id
) {
    // ...
}
```

#### 查询参数

```java
@GetMapping("/blogs")
@Operation(summary = "获取博客列表")
public Result getBlogs(
    @Parameter(name = "page", description = "页码", example = "1")
    @RequestParam(defaultValue = "1") Integer page,

    @Parameter(name = "size", description = "每页数量", example = "10")
    @RequestParam(defaultValue = "10") Integer size
) {
    // ...
}
```

#### 请求体参数

```java
@Schema(description = "用户登录请求")
public class UserLoginRequest {

    @Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED, example = "admin")
    private String username;

    @Schema(description = "密码", requiredMode = Schema.RequiredMode.REQUIRED, example = "123456")
    private String password;
}
```

---

## 🎯 注解详细说明

### @Tag

用于 Controller 类上，标记 API 分组。

| 参数 | 类型 | 说明 |
|------|------|------|
| name | String | API 分组名称 |
| description | String | 分组描述 |

### @Operation

用于方法上，描述 API 操作。

| 参数 | 类型 | 说明 |
|------|------|------|
| summary | String | API 简短描述 |
| description | String | API 详细说明 |
| tags | String[] | 分组标签 |

### @Parameter

用于参数上，描述单个参数。

| 参数 | 类型 | 说明 |
|------|------|------|
| name | String | 参数名称 |
| description | String | 参数说明 |
| required | boolean | 是否必填 |
| example | String | 示例值 |

### @Schema

用于 Java Bean 或属性上，描述模型。

| 参数 | 类型 | 说明 |
|------|------|------|
| description | String | 模型描述 |
| requiredMode | RequiredMode | 是否必填 |
| example | String | 示例值 |
| hidden | boolean | 是否隐藏 |

---

## ⚠️ 注意事项

1. **生产环境建议限制 Swagger 访问**：避免泄露 API 信息，可以通过 Nginx 限制访问路径

2. **JWT 认证**：访问需要认证的接口前，必须在 Swagger UI 中配置 Token

3. **Token 格式**：Token 格式为 `Bearer your_token`，注意 `Bearer` 后面有空格

4. **Token 获取**：先调用登录接口 `/login` 获取 Token，然后在 Swagger UI 中配置

5. **拦截器排除**：已在 `WebConfiguration` 中排除 Swagger 相关路径，确保可以正常访问文档页面

---

## 🐛 常见问题

### 1. Swagger UI 404 错误

**原因**：路径访问错误或依赖未正确加载

**解决**：确认访问地址为 `http://localhost:8090/swagger-ui/index.html`（注意是 `/index.html`，不是 `.html`）

### 2. 接口列表为空

**原因**：Controller 上没有 `@RestController` 注解或路径配置错误

**解决**：SpringDoc 会自动扫描所有 `@RestController` 类，确认 Controller 注解正确

### 3. 401 未授权错误

**原因**：未配置 JWT Token 或 Token 过期

**解决**：点击右上角 Authorize 按钮，配置有效的 Token

### 4. 拦截器拦截了 Swagger 请求

**原因**：拦截器未排除 Swagger 路径

**解决**：已在 `WebConfiguration` 中排除 Swagger 路径，确认配置正确

---

## 📚 参考资料

- [SpringDoc 官方文档](https://springdoc.org/)
- [OpenAPI 3 规范](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
