# Swagger 使用指南

Swagger 2.x 注解使用说明。

> [返回后端文档](./README.md)

---

## 简介

## 🚀 快速开始

### 1. 访问 Swagger UI

启动项目后，访问以下地址：

```
http://localhost:8090/swagger-ui.html
```

### 2. 查看接口文档

Swagger UI 会自动扫描 `com.example.blog.web` 包下的所有 Controller，生成 API 文档。

## 🔐 使用 JWT 认证

由于项目使用 JWT 进行认证，需要在 Swagger 中配置 Authorization：

1. 点击页面右上角的 **Authorize** 按钮
2. 在弹出框中输入 JWT Token（格式：`Bearer your_token_here`）
3. 点击 **Authorize** 确认
4. 之后的所有请求都会自动带上 Token

**注意**：Token 需要先通过登录接口获取。

## 📝 常用注解

### Controller 类注解

```java
@Api(tags = "用户管理")
@RestController
@RequestMapping("/user")
public class UserController {
    // ...
}
```

### 接口方法注解

```java
@ApiOperation(value = "用户登录", notes = "使用用户名和密码登录")
@ApiResponses({
    @ApiResponse(code = 200, message = "登录成功"),
    @ApiResponse(code = 401, message = "认证失败")
})
@PostMapping("/login")
public Result login(@RequestBody User user) {
    // ...
}
```

### 参数注解

#### 请求体参数

```java
@ApiModel(description = "用户登录请求")
public class UserLoginRequest {
    @ApiModelProperty(value = "用户名", required = true, example = "admin")
    private String username;

    @ApiModelProperty(value = "密码", required = true, example = "123456")
    private String password;
}
```

#### 路径参数

```java
@GetMapping("/blog/{id}")
public Result getBlog(
    @ApiParam(name = "id", value = "博客ID", required = true)
    @PathVariable Long id
) {
    // ...
}
```

#### 查询参数

```java
@GetMapping("/blogs")
public Result getBlogs(
    @ApiParam(name = "page", value = "页码", defaultValue = "1")
    @RequestParam(defaultValue = "1") Integer page,

    @ApiParam(name = "size", value = "每页数量", defaultValue = "10")
    @RequestParam(defaultValue = "10") Integer size
) {
    // ...
}
```

## 🎯 注解详细说明

### @Api

用于 Controller 类上，标记这是一个 Swagger API 资源。

| 参数 | 类型 | 说明 |
|------|------|------|
| tags | String[] | API 分组标签 |
| description | String | API 描述（已废弃） |
| hidden | boolean | 是否隐藏此 API |

**示例**：

```java
@Api(tags = "博客管理")
@RestController
@RequestMapping("/blog")
public class BlogController {
    // ...
}
```

### @ApiOperation

用于方法上，描述 API 操作。

| 参数 | 类型 | 说明 |
|------|------|------|
| value | String | API 简短描述 |
| notes | String | API 详细说明 |
| httpMethod | String | HTTP 方法 |
| response | Class | 返回类型 |
| tags | String[] | 分组标签 |

**示例**：

```java
@ApiOperation(value = "获取博客列表", notes = "分页查询所有博客")
@GetMapping("/list")
public Result getBlogList() {
    // ...
}
```

### @ApiParam

用于参数上，描述单个参数。

| 参数 | 类型 | 说明 |
|------|------|------|
| name | String | 参数名称 |
| value | String | 参数说明 |
| required | boolean | 是否必填 |
| defaultValue | String | 默认值 |
| example | String | 示例值 |

**示例**：

```java
@GetMapping("/blog/{id}")
public Result getBlog(
    @ApiParam(name = "id", value = "博客ID", required = true, example = "1")
    @PathVariable Long id
) {
    // ...
}
```

### @ApiModel

用于 Java Bean 上，描述模型。

| 参数 | 类型 | 说明 |
|------|------|------|
| value | String | 模型名称 |
| description | String | 模型描述 |

**示例**：

```java
@ApiModel(description = "用户信息")
public class User {
    // ...
}
```

### @ApiModelProperty

用于 Java Bean 属性上，描述属性。

| 参数 | 类型 | 说明 |
|------|------|------|
| value | String | 属性说明 |
| name | String | 属性名称 |
| required | boolean | 是否必填 |
| example | String | 示例值 |
| hidden | boolean | 是否隐藏 |

**示例**：

```java
@ApiModel(description = "用户信息")
public class User {
    @ApiModelProperty(value = "用户ID", example = "1")
    private Long id;

    @ApiModelProperty(value = "用户名", required = true, example = "admin")
    private String username;

    @ApiModelProperty(value = "邮箱", required = true, example = "admin@example.com")
    private String email;
}
```

### @ApiResponse 和 @ApiResponses

描述接口响应信息。

| 参数 | 类型 | 说明 |
|------|------|------|
| code | int | HTTP 状态码 |
| message | String | 响应消息 |
| response | Class | 响应类型 |

**示例**：

```java
@ApiResponses({
    @ApiResponse(code = 200, message = "操作成功", response = Result.class),
    @ApiResponse(code = 400, message = "请求参数错误"),
    @ApiResponse(code = 401, message = "未授权"),
    @ApiResponse(code = 404, message = "资源不存在"),
    @ApiResponse(code = 500, message = "服务器内部错误")
})
@GetMapping("/blog/{id}")
public Result getBlog(@PathVariable Long id) {
    // ...
}
```

## 📋 完整示例

### Controller 示例

```java
@Api(tags = "博客管理")
@RestController
@RequestMapping("/blog")
public class BlogController {

    @Autowired
    private BlogService blogService;

    @ApiOperation(value = "获取博客列表", notes = "分页查询所有博客，支持按分类和标签筛选")
    @ApiResponses({
        @ApiResponse(code = 200, message = "查询成功"),
        @ApiResponse(code = 400, message = "参数错误")
    })
    @GetMapping("/list")
    public Result<PageResult<Blog>> getBlogList(
        @ApiParam(name = "page", value = "页码", defaultValue = "1")
        @RequestParam(defaultValue = "1") Integer page,

        @ApiParam(name = "size", value = "每页数量", defaultValue = "10")
        @RequestParam(defaultValue = "10") Integer size,

        @ApiParam(name = "typeId", value = "分类ID")
        @RequestParam(required = false) Long typeId,

        @ApiParam(name = "tagId", value = "标签ID")
        @RequestParam(required = false) Long tagId
    ) {
        return blogService.getBlogList(page, size, typeId, tagId);
    }

    @ApiOperation(value = "获取博客详情", notes = "根据博客ID获取详细信息")
    @GetMapping("/{id}")
    public Result<Blog> getBlogById(
        @ApiParam(name = "id", value = "博客ID", required = true)
        @PathVariable Long id
    ) {
        return blogService.getBlogById(id);
    }

    @ApiOperation(value = "创建博客", notes = "创建新博客（需要管理员权限）")
    @PostMapping("/create")
    public Result<Blog> createBlog(
        @ApiParam(name = "blog", value = "博客信息", required = true)
        @RequestBody @Valid Blog blog
    ) {
        return blogService.createBlog(blog);
    }
}
```

### DTO 示例

```java
@ApiModel(description = "博客信息")
public class Blog {

    @ApiModelProperty(value = "博客ID", example = "1")
    private Long id;

    @ApiModelProperty(value = "博客标题", required = true, example = "Spring Boot 入门教程")
    private String title;

    @ApiModelProperty(value = "博客内容", required = true)
    private String content;

    @ApiModelProperty(value = "博客描述", example = "这是一篇关于 Spring Boot 的教程")
    private String description;

    @ApiModelProperty(value = "首图URL", example = "https://example.com/cover.jpg")
    private String firstPicture;

    @ApiModelProperty(value = "是否推荐", example = "true")
    private Boolean recommend;

    @ApiModelProperty(value = "发布状态", example = "true")
    private Boolean published;

    @ApiModelProperty(value = "创建时间", example = "2024-01-01T00:00:00")
    private Date createTime;

    @ApiModelProperty(value = "更新时间", example = "2024-01-01T00:00:00")
    private Date updateTime;

    @ApiModelProperty(value = "浏览次数", example = "100")
    private Integer views;

    @ApiModelProperty(value = "博客分类")
    private Type type;

    @ApiModelProperty(value = "博客标签")
    private List<Tag> tags;

    // getters and setters
}
```

## 🔧 配置说明

Swagger 配置位于 `com.example.blog.config.SwaggerConfig`：

```java
@Configuration
@EnableSwagger2
public class SwaggerConfig {

    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.example.blog.web"))
                .paths(PathSelectors.any())
                .build()
                .securitySchemes(securitySchemes())
                .securityContexts(securityContexts());
    }
}
```

### 自定义配置

如需修改扫描包路径，修改 `SwaggerConfig` 中的 `basePackage`：

```java
.apis(RequestHandlerSelectors.basePackage("com.example.blog.web"))
```

如需修改 API 信息，修改 `apiInfo()` 方法：

```java
private ApiInfo apiInfo() {
    return new ApiInfoBuilder()
            .title("你的 API 标题")
            .description("你的 API 描述")
            .contact(new Contact("作者名", "网址", "邮箱"))
            .version("版本号")
            .build();
}
```

## ⚠️ 注意事项

1. **生产环境建议关闭 Swagger**：避免泄露 API 信息，可以在配置文件中添加条件控制

```java
@Profile({"dev", "test"})
@Configuration
@EnableSwagger2
public class SwaggerConfig {
    // ...
}
```

2. **JWT 认证**：访问需要认证的接口前，必须在 Swagger UI 中配置 Token

3. **Token 格式**：Token 格式为 `Bearer your_token`，注意 `Bearer` 后面有空格

4. **Token 获取**：先调用登录接口 `/login` 获取 Token，然后在 Swagger UI 中配置

5. **拦截器配置**：已在 `WebConfiguration` 中排除 Swagger 相关路径，确保可以正常访问

## 🐛 常见问题

### 1. Swagger UI 404 错误

**原因**：静态资源映射问题

**解决**：检查 `SwaggerWebConfiguration` 配置是否正确

### 2. 接口列表为空

**原因**：扫描包路径配置错误

**解决**：检查 `SwaggerConfig` 中的 `basePackage` 是否正确

### 3. 401 未授权错误

**原因**：未配置 JWT Token 或 Token 过期

**解决**：点击右上角 Authorize 按钮，配置有效的 Token

### 4. 拦截器拦截了 Swagger 请求

**原因**：拦截器未排除 Swagger 路径

**解决**：已在 `WebConfiguration` 中排除 Swagger 路径，确认配置正确

## 📚 参考资料

- [Springfox 官方文档](http://springfox.github.io/springfox/)
- [Spring Boot 集成 Swagger](https://springfox.github.io/springfox/docs/current/)
- [Swagger 注解文档](https://github.com/swagger-api/swagger-core/wiki/Annotations-1.5.X)

---

如有问题，请提交 Issue 或联系作者。
