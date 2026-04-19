# Live2D 看板娘集成方案

本文档说明当前项目的 Live2D 看板娘集成实现方案。

## 技术栈

- **渲染引擎**: [PIXI.js](https://pixijs.com/) v7.4.2
- **Live2D 库**: [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) v0.4.0
- **运行时**: Live2D Cubism 2 & Cubism 4 官方运行时
- **框架**: Next.js + React + TypeScript
- **样式**: Tailwind CSS

## 项目结构

```
web/
├── public/live2d/                  # 静态资源
│   ├── models/                     # Live2D 模型文件
│   │   ├── ariu/                   # 模型文件夹
│   │   ├── mimi/
│   │   └── ...
│   ├── live2d.min.js              # Cubism 2 运行时
│   └── live2dcubismcore.min.js    # Cubism 4 运行时
│
├── src/lib/live2d/                 # Live2D 核心代码
│   ├── components/
│   │   └── Live2DContainer.tsx    # 主容器组件
│   ├── hooks/
│   │   ├── useLive2DModel.ts      # 模型加载 Hook
│   │   ├── useDrag.ts             # 拖拽功能 Hook
│   │   └── useModelManager.ts     # (未使用)
│   ├── types.ts                   # TypeScript 类型定义
│   ├── message.ts                 # 消息气泡管理
│   ├── logger.ts                  # 日志工具
│   └── utils.ts                   # 工具函数
│
└── src/components/
    └── Live2DWidget.tsx           # 对外暴露的组件入口
```

## 核心实现

### 1. 运行时预加载

`pixi-live2d-display` 需要 Cubism 运行时先加载到全局环境。在 `useLive2DModel.ts` 中：

```typescript
// 并行加载两个运行时
await Promise.all([
  loadScript('/live2d/live2d.min.js'),      // Cubism 2
  loadScript('/live2d/live2dcubismcore.min.js')  // Cubism 4
]);

// 动态导入 pixi-live2d-display
const { Live2DModel } = await import('pixi-live2d-display');
```

### 2. PIXI 应用配置

```typescript
appRef.current = new PIXI.Application({
  view: canvas,
  width: 220,
  height: 320,
  backgroundAlpha: 0,        // 透明背景
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  preserveDrawingBuffer: true,  // 启用截图功能
});
```

### 3. 模型加载

```typescript
const model = await Live2DModel.from(modelPath, {
  autoUpdate: true,
  autoInteract: false,  // 禁用自动交互（PIXI v7 兼容性）
});

// 手动设置交互
model.eventMode = 'static';
model.cursor = 'pointer';
model.on('pointertap', () => { /* ... */ });
```

### 4. 组件使用

```tsx
import { Live2DWidget } from '@/components/Live2DWidget';

// 在页面中使用
<Live2DWidget />
```

## 功能特性

| 功能 | 说明 |
|------|------|
| 模型切换 | 支持多模型循环切换 |
| 拖拽移动 | 可拖拽到屏幕任意位置 |
| 消息气泡 | 点击/悬停触发消息，支持一言API |
| 拍照保存 | 截图保存当前模型画面 |
| 响应式 | 自适应不同屏幕尺寸 |

## 模型配置

模型配置在 `Live2DWidget.tsx` 中：

```typescript
const models = [
  {
    path: '/live2d/models/ariu/ariu.model3.json',
    name: 'Ariu',
    message: '我是 Ariu！'
  },
  // ...
];
```

### 支持的模型格式

- **Cubism 2**: `.model.json`
- **Cubism 3/4/5**: `.model3.json`

## 消息配置

消息配置通过 `TipsConfig` 类型定义：

```typescript
const tips: TipsConfig = {
  message: {
    welcome: ['欢迎语1', '欢迎语2'],
    tapBody: ['点击身体时的消息'],
    hoverBody: ['悬停时的消息'],
    // ...
  },
  mouseover: [
    { selector: 'a[href^="/post"]', text: ['查看文章'] }
  ],
  click: [
    { selector: '.theme-toggle', text: ['切换主题'] }
  ],
};
```

## 注意事项

### PIXI 版本兼容性

`pixi-live2d-display` 仅支持 PIXI v6/v7，**不支持 v8**。

```json
{
  "pixi.js": "^7.4.2",
  "pixi-live2d-display": "^0.4.0"
}
```

### 事件系统

PIXI v7 使用新的事件系统，与旧版 `interaction` 不兼容：

```typescript
// ✅ PIXI v7 正确方式
model.eventMode = 'static';
model.on('pointertap', callback);

// ❌ 旧版方式（已废弃）
model.interactive = true;
```

### 截图功能

需要启用 `preserveDrawingBuffer` 并使用 PIXI 的 `extract` 插件：

```typescript
const image = await app.renderer.extract.image(app.stage);
```

## 依赖安装

```bash
npm install pixi.js@7.4.2 pixi-live2d-display
# or
pnpm add pixi.js@7.4.2 pixi-live2d-display
```

## 未来优化方向

1. 模型懒加载：大模型按需加载
2. 语音合成：集成 TTS 实现语音交互
3. 表情切换：支持模型表情/动作切换
4. 移动端优化：触摸交互优化

## 参考资源

- [pixi-live2d-display 文档](https://github.com/guansss/pixi-live2d-display)
- [PIXI.js 官方文档](https://pixijs.download/release/docs/index.html)
- [Live2D 官方 Cubism SDK](https://www.live2d.com/download/cubism-sdk/download-web/)
