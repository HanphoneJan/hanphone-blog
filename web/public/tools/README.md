# 寒枫小工具 · Hanphone Tool

> 一组轻量、开箱即用的实用工具集合。纯前端实现，无需服务器，即开即用。

---

## 🗂 工具列表

<!-- TOOLS_START -->

| 工具                  | 目录                                                          | 描述                                                                                            | 类型 |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---- |
| 🛡️ 跳转拦截器       | [`browser-extension-intercept/`](browser-extension-intercept/) | 在网页跳转时弹出确认框，避免误操作                                                              | 扩展 |
| 🔍 iPhone风格计算器   | [`calculator/`](calculator/)                                   | 仿 iPhone 风格的网页计算器，支持四则运算、百分比、小数，精准浮点处理，响应式设计。              | 网页 |
| 🗂️ Markdown 转换器  | [`markdown-converter/`](markdown-converter/)                   | 实时 Markdown 预览与富文本复制，支持 LaTeX 数学公式，一键复制到剪贴板，双栏响应式布局。         | 网页 |
| 🗂️ 高效照片压缩工具 | [`photo-compressor/`](photo-compressor/)                       | 浏览器端图片压缩，支持 JPG / PNG / WebP，可调节质量，实时预览对比，文件不上传服务器，保护隐私。 | 网页 |
| 🖼️ RGB调色板        | [`rgb-color-picker/`](rgb-color-picker/)                       | 交互式 RGB 颜色选择器，滑块实时调色，HEX 双向同步，随机颜色生成，一键复制颜色代码。             | 网页 |

<!-- TOOLS_END -->

---

## 🚀 快速开始

### 网页工具（直接打开）

克隆仓库后，直接用浏览器打开对应工具目录下的 `index.html`：

```bash
git clone https://github.com/hanphonejan/hanphone-tool.git
cd hanphone-tool
# 打开任意工具目录下的 index.html
```

或通过根目录的 [`index.html`](index.html) 进入工具导航页。

## 🛡️ 浏览器扩展安装

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 开启右上角「**开发者模式**」
3. 点击「**加载已解压的扩展程序**」
4. 选择 `browser-extension-intercept/` 目录
5. 安装完成后，点击扩展图标可配置拦截模式

---

## 📦 项目结构

```
hanphone-tool/
├── index.html                    # 工具导航门户（可直接部署为 GitHub Pages 主页）
├── calculator/
│   └── index.html                # iPhone 风格计算器
├── markdown-converter/
│   ├── index.html                # Markdown 转换器主界面
│   ├── marked.min.js             # Markdown 解析库
│   └── latex.js                  # LaTeX 公式支持
├── photo-compressor/
│   └── index.html                # 照片压缩工具
├── rgb-color-picker/
│   └── index.html                # RGB 调色板
└── browser-extension-intercept/
    ├── manifest.json             # 扩展配置（Manifest V2）
    ├── background.js             # 后台拦截脚本
    ├── content.js                # 页面内跳转拦截
    ├── popup.html / popup.js     # 弹出窗口
    └── options.html / options.js # 配置页面
```

---

## ✨ 工具详情

### 🧮 iPhone 计算器

仿 iOS 系统计算器的网页版，界面与交互高度还原。

**功能特性**

- 加、减、乘、除及小数运算
- 百分比转换（`%`）
- 正负号切换（`+/-`）
- 显示计算历史
- 精确浮点数处理（避免 `0.1 + 0.2` 精度问题）
- 响应式设计，适配移动端

---

### 📝 Markdown 转换器

支持 LaTeX 公式的在线 Markdown 编辑与转换工具。

**功能特性**

- 实时双栏预览（移动端自动切换单栏）
- 支持完整 Markdown 语法（标题、列表、代码块、表格等）
- LaTeX 数学公式渲染（`\(...\)` 行内，`\[...\]` 块级）
- 一键复制富文本到剪贴板（兼容 Word、飞书、Notion 等）

---

### 🖼️ 照片压缩工具

纯浏览器端图片压缩，文件**不会上传到任何服务器**，保护隐私。

**功能特性**

- 支持 JPG、PNG、WebP 格式输入与输出
- 可调节压缩质量（1–100%）
- 实时压缩前后尺寸与大小对比
- 自动迭代压缩，确保输出文件小于原图
- 一键下载压缩结果

---

### 🎨 RGB 调色板

直观的颜色调节工具，适合前端开发和设计参考。

**功能特性**

- R / G / B 三通道滑块（范围 0–255）
- 实时颜色预览
- HEX 代码双向同步（滑块 ↔ 输入框）
- 随机颜色生成
- 一键复制 HEX 代码
- 根据亮度自动调整文字颜色（可读性保障）

---

### 🛡️ 浏览器跳转拦截扩展

防止网页误操作跳转的 Chrome 扩展。

**功能特性**

- 拦截所有形式的页面跳转：
  - 链接点击（`<a>` 标签）
  - 表单提交（`<form>`）
  - JavaScript `location` / `history` API
  - `meta refresh` 自动刷新
- 弹出确认框，由用户决定是否放行
- 两种拦截模式：全局拦截 / 仅指定域名
- 支持一键启用 / 停用

---

### 新增工具示例

在 `index.html` 的 `TOOLS` 数组中添加：

```js
{
  name: "新工具名称",
  dir: "new-tool/",
  href: "new-tool/index.html",
  icon: "🔧",
  iconBg: "rgba(96, 165, 250, 0.15)",
  iconColor: "#60a5fa",
  desc: "工具简要描述。",
  tags: [
    { label: "标签1", color: "rgba(96,165,250,0.15)", text: "#60a5fa" },
  ],
},
```
