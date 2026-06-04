//三斜线指令（Triple-Slash Directive），用于引入 Vite 客户端环境的类型定义。
/// <reference types="vite/client" />

/**
 * 声明模块：用于定义 Vue 单文件组件（.vue 文件）的类型
 * TypeScript 默认无法识别 .vue 文件的类型，因为 .vue 文件是 Vue 特有的文件格式。
 * 通过这个声明，我们告诉 TypeScript 如何处理 .vue 文件。
 * 这里使用 `DefineComponent` 类型来定义 Vue 组件的类型。
 * `DefineComponent` 是 Vue 3 提供的一个工具类型，用于定义组件的类型。
 */
declare module '*.vue' {
    import { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
  }
/**
 * 添加一个类型声明文件来告诉 TypeScript 如何处理 Vite 客户端环境中的类型。
 * JavaScript 是动态类型语言，没有原生的类型信息，而 TypeScript 则依赖类型检查来工作。
 * 当我们使用 JavaScript 库时，TypeScript 无法直接理解这些库的类型。
 * 因此，我们需要通过类型声明文件（.d.ts）来为这些库提供类型信息。
 * Vite 默认的类型定义是写给它的 Node.js API 的。
 * 要将其补充到一个 Vite 应用的客户端代码环境，需要添加一个 d.ts 声明文件。
 * 这个文件的作用：
 * 1. 引入 Vite 客户端环境的类型定义（通过 `/// <reference types="vite/client" />`）。
 * 2. 定义 .vue 文件的类型，使 TypeScript 能够正确识别 Vue 单文件组件。
 */