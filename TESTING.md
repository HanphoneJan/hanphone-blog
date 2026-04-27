# 测试文档

本项目包含完整的测试套件，涵盖服务端单元测试和前端单元测试、E2E 测试。

## 📁 测试结构

```
hanphone-blog/
├── server/                          # Java Spring Boot 后端
│   └── src/test/java/com/example/blog/
│       ├── BlogApplicationTests.java    # 应用上下文测试
│       ├── util/                        # 工具类测试
│       │   ├── BcryptUtilsTest.java
│       │   └── MarkdownUtilsTest.java
│       ├── po/                          # 实体类测试
│       │   └── ResultTest.java
│       └── constants/                   # 常量类测试
│           └── ConstantsTest.java
│
└── web/                             # Next.js 前端
    ├── src/
    │   ├── test/
    │   │   └── setup.ts                 # 测试环境配置
    │   ├── lib/__tests__/
    │   │   └── utils.test.ts            # 工具函数测试
    │   └── components/__tests__/
    │       └── Button.test.tsx          # 组件测试
    │
    └── e2e/                           # E2E 测试（暂未配置）

└── admin-file/                       # 文件服务 (Express.js)
    └── server.js                     # 主服务（目前未配置独立测试套件）
```

## 🚀 运行测试

### Server (Java) 测试

```bash
cd server

# 运行所有测试
mvn test

# 运行单个测试类
mvn test -Dtest=BcryptUtilsTest

# 生成测试报告
mvn surefire-report:report
```

### Web (Next.js) 测试

由于项目采用了 **pnpm workspace**，推荐在根目录运行测试：

```bash
# 安装全量依赖
pnpm install

# 运行 Web 单元测试
pnpm --filter web test

# 运行 Web 单元测试（监视模式）
pnpm --filter web test:watch

# 生成覆盖率报告
pnpm --filter web test:coverage
```

### admin-file (Express.js) 测试

目前 admin-file 模块暂未配置独立的测试框架。需要时可引入 [Jest](https://jestjs.io/) 或 [Vitest](https://vitest.dev/) 并编写接口测试：

```bash
cd admin-file

# 手动启动服务进行接口验证
pnpm start

# 使用 curl 测试接口
curl -X POST http://localhost:4000/upload/avatar \
  -F "avatar=@test-avatar.png"
```

## 📊 CI/CD 集成

本项目使用 GitHub Actions 进行持续集成，配置位于 `.github/workflows/ci.yml`。

### CI 流程

每次推送或 PR 到 `main` 分支时，会自动运行：

1. **Server Tests**: Maven 单元测试 (JUnit 5)
2. **Web Unit Tests**: Vitest 单元测试
3. **Build Verification**: 服务端打包 + Gomoku 构建 + Web 构建

### 测试结果

- Server 测试报告会自动上传到 GitHub Artifacts
- 覆盖率报告可在 Actions 页面下载

## 📝 测试规范

### Server 测试规范

- 使用 JUnit 5 进行单元测试
- 测试类命名：`{被测类名}Test`
- 测试方法使用 `@DisplayName` 描述测试目的
- 每个测试方法应该独立，不依赖其他测试

### Web 单元测试规范

- 使用 Vitest 作为测试框架
- React 组件测试使用 `@testing-library/react`
- Mock 外部依赖（如 `next/navigation`, `next/image`）
- 测试文件放在 `__tests__` 目录或命名为 `*.test.ts`

## 🔧 添加新测试

### 添加 Server 单元测试

```java
package com.example.blog.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

class UserServiceTest {

    @Test
    @DisplayName("测试用户注册")
    void register_ShouldCreateNewUser() {
        // Arrange
        UserService service = new UserService();
        
        // Act
        User user = service.register("test@example.com", "password");
        
        // Assert
        assertNotNull(user);
        assertEquals("test@example.com", user.getEmail());
    }
}
```

### 添加 Web 单元测试

```typescript
// src/components/__tests__/MyComponent.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('应该正确渲染', () => {
    render(<MyComponent title="测试标题" />)
    expect(screen.getByText('测试标题')).toBeInTheDocument()
  })
})
```

### 添加 E2E 测试

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('我的功能', () => {
  test('应该正常工作', async ({ page }) => {
    await page.goto('/my-feature')
    await expect(page.locator('h1')).toHaveText('我的功能')
  })
})
```

## 📈 覆盖率目标

- **Server**: 建议达到 70% 以上代码覆盖率
- **Web**: 建议达到 60% 以上代码覆盖率

查看覆盖率报告：
- Server: `server/target/site/jacoco/index.html`
- Web: `web/coverage/index.html`

## 🐛 调试测试

### Server 调试

在 IDE 中右键点击测试方法选择 "Debug"，或添加断点运行：
```bash
mvn test -Dmaven.surefire.debug
```

### Web 调试

```bash
# Vitest UI 模式
pnpm vitest --ui

# Playwright 调试模式（如有配置）
pnpm exec playwright test --debug
```
