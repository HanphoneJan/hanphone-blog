# 后端技术文档

> [返回后端文档](./README.md)

---

## 项目结构

```
server/src/main/java/com/example/blog/
├── config/                           # 配置类
│   ├── ScheduleConfig.java           # 定时任务配置
│   ├── SwaggerConfig.java            # Swagger 文档配置
│   └── XssStringDeserializer.java    # Jackson 全局 String HTML 转义(@JsonComponent)
│
├── constants/                        # 常量定义
│   ├── CommonConstants.java          # 通用常量
│   └── PaginationConstants.java      # 分页常量
│
├── dao/                              # 数据访问层 (Repository)
│   ├── BlogRepository.java           # 博客数据访问 (JPA)
│   ├── BlogMonthlyVisitsRepository.java  # 博客月访问量
│   ├── CommentRepository.java        # 评论数据访问
│   ├── DocRepository.java            # 文档数据访问
│   ├── EssayCommentRepository.java   # 随笔评论
│   ├── EssayFileUrlRepository.java   # 随笔文件
│   ├── EssayRepository.java          # 随笔数据访问
│   ├── FriendLinkRepository.java     # 友情链接
│   ├── MessageRepository.java        # 留言
│   ├── PersonInfoRepository.java     # 个人信息
│   ├── ProjectRepository.java        # 项目
│   ├── TagRepository.java            # 标签
│   ├── TypeRepository.java           # 分类
│   ├── UserBlogLikeRepository.java   # 博客点赞
│   ├── UserEssayLikeRepository.java  # 随笔点赞
│   └── UserRepository.java           # 用户
│
├── DTO/                              # 数据传输对象
│   └── TagBlogCountDTO.java          # 标签博客数统计
│
├── enums/                            # 枚举类型
│   └── UserType.java                 # 用户类型枚举
│
├── filter/                           # 过滤器
│   ├── RequestValidationFilter.java   # URL 长度校验 & 递归路径防御
│   ├── XssFilter.java                # XSS 攻击过滤 + 安全响应头
│   └── XssHttpServletRequestWrapper.java  # XSS 请求包装
│
├── handler/                          # 异常处理器
│   └── ControllerExceptionHandler.java   # 全局异常处理
│
├── interceptor/                      # 拦截器
│   ├── TokenInterceptor.java         # JWT Token 验证
│   └── WebConfiguration.java         # Web 配置
│
├── po/                               # 持久化对象 (Entity)
│   ├── Blog.java                     # 博客
│   ├── BlogMonthlyVisits.java        # 博客月访问量
│   ├── Comment.java                  # 评论
│   ├── Essay.java                    # 随笔
│   ├── EssayComment.java             # 随笔评论
│   ├── EssayFileUrl.java             # 随笔文件URL
│   ├── FriendLink.java               # 友情链接
│   ├── Message.java                  # 留言
│   ├── PageResult.java               # 分页结果
│   ├── PersonInfo.java               # 个人信息
│   ├── Project.java                  # 项目
│   ├── Result.java                   # 统一响应结果
│   ├── StatusCode.java               # 状态码
│   ├── Tag.java                      # 标签
│   ├── Type.java                     # 分类
│   ├── User.java                     # 用户
│   ├── UserBlogLike.java             # 博客点赞
│   └── UserEssayLike.java            # 随笔点赞
│
├── service/                          # 业务逻辑层 (接口)
│   ├── BlogService.java
│   ├── BlogMonthlyVisitsService.java
│   ├── CommentService.java
│   ├── DocService.java               # 文档管理
│   ├── EmailCaptchaService.java      # 邮箱验证码
│   ├── EssayCommentService.java
│   ├── EssayService.java
│   ├── FriendLinkService.java
│   ├── LogCleanService.java          # 日志清理
│   ├── MessageService.java
│   ├── PersonInfoService.java
│   ├── ProjectService.java
│   ├── TagService.java
│   ├── TypeService.java
│   ├── UploadService.java            # 文件上传
│   └── UserService.java
│   └── impl/                         # 业务实现类
│       ├── BlogServiceImpl.java
│       ├── BlogMonthlyVisitsServiceImpl.java
│       ├── CommentServiceImpl.java
│       ├── DocServiceImpl.java
│       ├── EmailCaptchaServiceImpl.java
│       ├── EssayCommentServiceImpl.java
│       ├── EssayServiceImpl.java
│       ├── FriendLinkServiceImpl.java
│       ├── LogCleanServiceImpl.java
│       ├── MessageServiceImpl.java
│       ├── PersonInfoServiceImpl.java
│       ├── ProjectServiceImpl.java
│       ├── TagServiceImpl.java
│       ├── TypeServiceImpl.java
│       ├── UploadServiceImpl.java
│       └── UserServiceImpl.java
│
├── util/                             # 工具类
│   ├── BcryptUtils.java              # 密码加密
│   ├── MarkdownUtils.java            # Markdown 处理
│   ├── MyBeanUtils.java              # Bean 工具
│   └── TokenUtil.java                # JWT Token 工具
│
├── vo/                               # 视图对象
│   └── BlogQuery.java                # 博客查询条件
│
├── web/                              # 控制器层
│   ├── IndexController.java          # 首页/博客展示
│   ├── UserController.java           # 用户相关
│   ├── ArchiveShowController.java    # 归档
│   ├── CommentController.java        # 评论
│   ├── DocShowController.java        # 文档展示
│   ├── EssayShowController.java      # 随笔展示
│   ├── FriendLinkShowController.java # 友情链接展示
│   ├── MessageShowController.java    # 留言展示
│   ├── PersonInfoShowController.java # 个人信息展示
│   ├── ProjectShowController.java    # 项目展示
│   ├── TagShowController.java        # 标签展示
│   ├── TypeShowController.java       # 分类展示
│   └── admin/                        # 管理后台接口
│       ├── AdminIndexController.java # 后台首页
│       ├── AdministratorController.java  # 管理员
│       ├── BlogController.java       # 博客管理
│       ├── DocController.java        # 文档管理
│       ├── EssayController.java      # 随笔管理
│       ├── FriendLinkController.java # 友链管理
│       ├── PersonInfoController.java # 个人信息管理
│       ├── ProjectController.java    # 项目管理
│       ├── TagController.java        # 标签管理
│       └── TypeController.java       # 分类管理
│
├── BlogApplication.java              # 启动类
└── NotFoundException.java            # 自定义异常
```

---

## 实体关系

```
Blog (博客)
├── Type (分类) N:1
├── Tag (标签) N:M
├── Comment (评论) 1:N
└── UserBlogLike (点赞) 1:N

Essay (随笔)
├── EssayComment (评论) 1:N
├── EssayFileUrl (文件) 1:N
└── UserEssayLike (点赞) 1:N

User (用户)
├── UserType (类型) 枚举
├── Comment (评论) 1:N
└── Message (留言) 1:N
```

---

## API 分组

### 前台展示接口 (web/)

| Controller | 路径前缀 | 功能 |
|------------|----------|------|
| IndexController | `/` | 首页、博客列表、搜索 |
| UserController | `/user` | 用户注册、登录、验证码 |
| ArchiveShowController | `/archives` | 博客归档 |
| CommentController | `/comments` | 评论相关 |
| DocShowController | `/docs` | 文档展示 |
| EssayShowController | `/essays` | 随笔展示 |
| FriendLinkShowController | `/friendlinks` | 友情链接 |
| MessageShowController | `/messages` | 留言板 |
| PersonInfoShowController | `/personinfo` | 个人信息 |
| ProjectShowController | `/projects` | 项目展示 |
| TagShowController | `/tags` | 标签 |
| TypeShowController | `/types` | 分类 |

### 管理后台接口 (web/admin/)

| Controller | 路径前缀 | 功能 |
|------------|----------|------|
| AdminIndexController | `/admin` | 后台首页、仪表盘 |
| AdministratorController | `/administrator` | 管理员登录 |
| BlogController | `/admin/blogs` | 博客增删改查 |
| DocController | `/admin/docs` | 文档增删改查 |
| EssayController | `/admin/essays` | 随笔增删改查 |
| FriendLinkController | `/admin/friendlinks` | 友链管理 |
| PersonInfoController | `/admin/personinfo` | 个人资料 |
| ProjectController | `/admin/projects` | 项目管理 |
| TagController | `/admin/tags` | 标签管理 |
| TypeController | `/admin/types` | 分类管理 |

---

## 安全设计

### JWT 认证流程

```
1. 用户登录 → UserController.login()
2. 验证用户名密码 → UserServiceImpl
3. 生成 JWT Token → TokenUtil
4. 返回 Token 给客户端
5. 客户端存储 Token
6. 后续请求 Header 携带: Authorization: Bearer <token>
7. TokenInterceptor 拦截验证
8. 验证通过 → 继续请求
```

### 防护机制

- **XSS 多层防御**: XssFilter 过滤请求参数 + XssStringDeserializer Jackson 全局转义 JSON Body
- **URL 攻击防御**: RequestValidationFilter 校验 URI 长度上限，防止超长 URL 导致 OOM；递归路径返回 404
- **密码加密**: BCrypt 加密存储 + 密码复杂度校验（长度 >=8，必须包含字母和数字）
- **验证码限流**: Redis 60 秒内同邮箱不可重复发送 + 邮箱格式/长度校验
- **Token 验证**: JWT + 拦截器（admin 接口）+ X-Internal-Key（内部 API）
- **SQL 注入**: JPA 参数化查询 & MyBatis-Plus 防注入机制
- **连接池保护**: HikariCP 最大 100 连接，防止并发耗尽
- **安全响应头**: X-Content-Type-Options, X-XSS-Protection, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy
- **CORS**: Origin 白名单校验
- **HTTP 方法控制**: 仅允许 GET/POST/PUT/DELETE/OPTIONS，TRACE/PATCH 等方法返回 405
- **用户类型默认值**: 新注册用户默认 type='0'，防御权限提升

---

## 定时任务

| 任务 | 类 | 说明 |
|------|-----|------|
| 日志清理 | LogCleanServiceImpl | 每天凌晨2点清理30天前日志 |

---

## 测试工具

项目包含两套 Python 黑盒测试工具，针对已部署的服务进行验证。

### 安全 & 功能回归测试 (`test.py`)

覆盖 12 个测试组、39 个用例：

| 测试组 | 内容 |
|--------|------|
| T1 基础设施层 | 安全响应头 (6 项) |
| T2 URL 超长 & 输入防御 | URI 超长 → 414, 递归路径 → 404, 超大分页裁剪 |
| T3 并发与连接池 | 10/20 并发请求 |
| T4 认证鉴权 | 无 token/伪造 token/无 key/弱 key |
| T5 XSS 防护 | JSON body 转义, 持久化验证 |
| T6 密码策略 | 长度 <8, 纯字母, 合法密码, 默认 userType |
| T7 验证码限流 | 首次发送, 60s 限流, 超长邮箱, 非法格式, 空邮箱 |
| T8 SQL 注入 | 单引号, OR 1=1, 路径注入 |
| T9 CORS | 白名单 Origin, 恶意 Origin |
| T10 HTTP 方法 | PUT → 405, TRACE → 405, DELETE |
| T11 评论功能 | 未登录评论, 字段校验, XSS 转义 |
| T12 Actuator | 端点最小暴露 |

```bash
cd server
python3 test.py [--base-url URL] [--skip-t11]
```

### 压力测试 (`stress_test.py`)

三种测试策略：

| 策略 | 命令 | 说明 |
|------|------|------|
| 渐进式加压 | `python3 stress_test.py` | 1→200 并发逐步增加，找到性能拐点 |
| 固定并发 | `python3 stress_test.py --concurrency 50 --duration 60` | 固定并发数，持续指定秒数 |
| 尖峰测试 | `python3 stress_test.py --spike` | 瞬间 200 并发冲击 |

输出指标：RPS、延迟 (min/avg/P50/P95/P99/max/stdev)、成功率、状态码分布、性能拐点分析与容量建议。

---

## 配置说明

### 配置管理

项目使用 `spring-dotenv` 管理配置，支持从 `.env` 文件或系统环境变量中读取配置项。

### 关键配置项

```properties
# 数据库
spring.datasource.url=jdbc:postgresql://${PG_HOST:localhost}:5432/${PG_DATABASE:blog}
spring.datasource.username=${PG_USERNAME}
spring.datasource.password=${PG_PASSWORD}

# 数据库连接池 (HikariCP)
spring.datasource.hikari.maximum-pool-size=100
spring.datasource.hikari.minimum-idle=5

# Redis
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.password=${REDIS_PASSWORD}
spring.redis.lettuce.pool.max-active=16

# JWT
jwt.secret=${TOKEN_SECRET}
jwt.expiration=604800000

# 安全策略
password.min-length=8
captcha.rate-limit-seconds=60
captcha.max-email-length=254
```

---

## 依赖管理

主要依赖见 `pom.xml`：
- Spring Boot 3.2.x
- Spring Data JPA
- MyBatis-Plus 3.5.x
- PostgreSQL Driver
- Redis
- JWT (java-jwt)
- OpenAPI 3 (SpringDoc)
- Lombok
- Gson
- Jsoup
- CommonMark
- BCrypt
- Spring Boot Mail
- Spring Boot Actuator
- Spring Boot DevTools
