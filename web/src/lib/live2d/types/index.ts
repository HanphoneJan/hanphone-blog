/**
 * Live2D Widget 类型定义
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'trace';

export interface TimeConfig {
  hour: string;
  text: string;
}

export interface MessageConfig {
  default: string[];
  console: string;
  copy: string;
  visibilitychange: string;
  changeSuccess: string;
  changeFail: string;
  photo: string;
  goodbye: string;
  hitokoto: string;
  welcome: string;
  referrer: string;
  hoverBody: string | string[];
  tapBody: string | string[];
  /** 滚动深度消息: [30%消息, 70%消息, 100%消息] */
  scrollDepth: string[];
  /** 评论框获得焦点时显示的消息 */
  commentFocus: string | string[];
  /** 博客上下文消息模板，{title} 替换为标题, {tags} 替换为标签 */
  articleContext: string;
}

export interface MouseEventConfig {
  selector: string;
  /** 静态文本（与 dynamicText 二选一，dynamicText 优先级更高） */
  text?: string | string[];
  /** 仅在指定页面路径生效（正则字符串），undefined 表示全局生效 */
  pages?: string[];
  /** 动态提取文本（优先级高于 text 字段）。参数为 selector 匹配到的元素，返回 null 表示不显示消息 */
  dynamicText?: (el: Element) => string | string[] | null;
  /** 按元素 URL/ID 去重，每元素仅触发一次 */
  oncePerElement?: boolean;
}

export interface SeasonConfig {
  date: string;
  text: string | string[];
}

export interface ModelInfo {
  name: string;
  path: string;
  message: string;
}

export interface TipsConfig {
  message: MessageConfig;
  time: TimeConfig[];
  mouseover: MouseEventConfig[];
  click: MouseEventConfig[];
  seasons: SeasonConfig[];
  models: ModelInfo[];
}

export interface ModelListCDN {
  messages: string[];
  models: string[] | string[][];
}

export interface Live2DConfig {
  waifuPath?: string;
  apiPath?: string;
  cdnPath?: string;
  cubism2Path?: string;
  cubism5Path?: string;
  modelId?: number;
  tools?: string[];
  drag?: boolean;
  logLevel?: LogLevel;
  models?: ModelInfo[];
}

export interface ToolItem {
  icon: React.ReactNode;
  callback: () => void;
}

export interface Tools {
  [key: string]: ToolItem;
}
