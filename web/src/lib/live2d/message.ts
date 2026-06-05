'use client';

/**
 * Live2D 消息显示模块
 */

import { randomSelection, i18n, getSessionStorageInt, setSessionStorage, removeSessionStorage } from './utils';
import { TimeConfig } from './types';

let messageTimer: NodeJS.Timeout | null = null;

export type MessageCallback = (text: string, timeout: number, priority: number) => void;

let messageHandler: MessageCallback | null = null;

let modelReady = false;

/**
 * 设置模型就绪状态
 */
export function setModelReady(ready: boolean) {
  modelReady = ready;
}

/**
 * 获取模型就绪状态
 */
export function isModelReady(): boolean {
  return modelReady;
}

/**
 * 设置消息处理器
 */
export function setMessageHandler(handler: MessageCallback) {
  messageHandler = handler;
}

/**
 * 显示消息
 */
export function showMessage(
  text: string | string[],
  timeout: number,
  priority: number,
  override: boolean = true
): boolean {
  if (!modelReady) return false;

  const currentPriority = getSessionStorageInt('waifu-message-priority', 0);

  if (
    !text ||
    (override && currentPriority > priority) ||
    (!override && currentPriority >= priority)
  ) {
    return false;
  }
  
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }
  
  const messageText = randomSelection(text);
  setSessionStorage('waifu-message-priority', String(priority));
  
  // 调用React组件的消息处理器
  if (messageHandler) {
    messageHandler(messageText, timeout, priority);
  }
  
  messageTimer = setTimeout(() => {
    removeSessionStorage('waifu-message-priority');
  }, timeout);

  return true;
}

/**
 * 根据当前页面路径获取页面类型的描述文字
 */
export function getPageContext(): { type: string; label: string } {
  if (typeof window === 'undefined') return { type: 'default', label: '' };
  const path = location.pathname;

  if (path === '/') return { type: 'home', label: '首页' };
  if (path === '/about') return { type: 'about', label: '关于页' };
  if (path === '/blog') return { type: 'blogList', label: '博客列表' };
  if (path.match(/^\/blog\/[^/]+$/)) return { type: 'blogDetail', label: '文章页' };
  if (path === '/essays') return { type: 'essays', label: '随笔' };
  if (path === '/docs') return { type: 'docs', label: '文档' };
  if (path.match(/^\/docs\/[^/]+$/)) return { type: 'docDetail', label: '文档详情' };
  if (path === '/projects') return { type: 'projects', label: '项目' };
  if (path === '/links') return { type: 'links', label: '友链' };
  if (path === '/messages') return { type: 'messages', label: '留言' };
  if (path === '/privacy') return { type: 'privacy', label: '隐私政策' };
  if (path === '/terms') return { type: 'terms', label: '服务条款' };

  return { type: 'default', label: '' };
}

/**
 * 页面路径 → 欢迎消息映射
 */
const PAGE_WELCOME_MESSAGES: Record<string, string[]> = {
  home: [
    '欢迎来到寒枫的博客！随便看看~',
    '这里是云林有风，很高兴见到你！',
  ],
  about: [
    '想了解寒枫吗？这里是我的个人介绍~',
    '关于我的故事，都在这里了！',
  ],
  blogList: [
    '这里有很多有趣的博客，慢慢看~',
    '博客列表在此，挑一篇感兴趣的吧！',
  ],
  blogDetail: [
    '这篇博客看起来不错呢~慢慢阅读吧！',
    '好好享受阅读的时光~',
  ],
  essays: [
    '随笔记录生活的点滴，希望你喜欢~',
    '这里是一些随性的文字~',
  ],
  docs: [
    '文档区，找找你需要的内容吧~',
    '这里有整理好的文档资料哦~',
  ],
  docDetail: [
    '这篇文档很详细呢，好好学习~',
    '认真阅读文档是个好习惯！',
  ],
  projects: [
    '这里展示了我的项目作品~',
    '来看看我做过哪些有趣的项目吧！',
  ],
  links: [
    '这些都是我推荐的好朋友和好网站~',
    '友链区，去认识一下新朋友吧！',
  ],
  messages: [
    '有什么想说的就留言吧~',
    '留言板在此，畅所欲言！',
  ],
  default: [
    '欢迎来到我的博客！',
    '今天也要元气满满哦~',
    '有什么我可以帮你的吗？',
  ],
};

/**
 * 获取页面特定的欢迎消息（不包含时间段问候）
 */
export function getPageSpecificWelcome(): string {
  const { type } = getPageContext();
  const messages = PAGE_WELCOME_MESSAGES[type] || PAGE_WELCOME_MESSAGES.default;
  return randomSelection(messages);
}

/**
 * 页面类型 → 空闲消息映射
 */
const PAGE_DEFAULT_MESSAGES: Record<string, string[]> = {
  home: [
    '首页内容很丰富，慢慢逛逛吧~',
    '看看推荐的博客，说不定有你感兴趣的！',
    '往下翻翻，还有项目展示哦~',
  ],
  about: [
    '想了解寒枫的经历和技能吗？',
    '这些技术方向都是热爱的领域~',
  ],
  blogList: [
    '博客列表在这里，挑一篇看看吧~',
    '用分类和标签可以快速筛选博客哦~',
    '左侧的目录树可以帮助你浏览~',
  ],
  blogDetail: [
    '慢慢阅读，注意休息眼睛哦~',
    '读完别忘了点赞和评论呀~',
    '右侧有博客目录，可以快速跳转~',
  ],
  essays: [
    '随笔记录了生活的点滴~',
    '给喜欢的随笔点个赞吧！',
    '你也可以写下自己的评论哦~',
  ],
  docs: [
    '文档中心有很多有用的资料~',
    '使用搜索可以快速找到你需要的文档~',
  ],
  docDetail: [
    '认真阅读文档，会有很多收获~',
    '左侧目录树可以帮你导航文档结构~',
  ],
  projects: [
    '这些项目都是实战经验的积累~',
    '可以按类型筛选，看看有没有你感兴趣的~',
  ],
  links: [
    '这些都是我推荐的好朋友和网站~',
    '有喜欢的链接就去看看吧！',
  ],
  messages: [
    '留言板是畅所欲言的地方~',
    '写下你想说的话，和大家交流吧~',
  ],
};

/**
 * 获取页面特定的空闲消息
 */
export function getPageSpecificDefaultMessages(): string[] {
  const { type } = getPageContext();
  return PAGE_DEFAULT_MESSAGES[type] || [];
}

/**
 * 生成欢迎消息
 */
export function welcomeMessage(
  time: TimeConfig[],
  welcomeTemplate?: string,
  referrerTemplate?: string
): string {
  if (typeof window === 'undefined') return '';

  if (location.pathname === '/') {
    // 如果在首页，根据时间显示不同问候
    for (const { hour, text } of time) {
      const now = new Date();
      const after = hour.split('-')[0];
      const before = hour.split('-')[1] || after;

      if (
        Number(after) <= now.getHours() &&
        now.getHours() <= Number(before)
      ) {
        return text;
      }
    }
  }

  if (!welcomeTemplate) return '';

  const text = i18n(welcomeTemplate, document.title);
  if (document.referrer === '' || !referrerTemplate) return text;

  const referrer = new URL(document.referrer);
  if (location.hostname === referrer.hostname) return text;

  return `${i18n(referrerTemplate, referrer.hostname)}<br>${text}`;
}

/**
 * 从博客页 DOM 中提取博客标题和标签
 */
export function extractArticleInfo(): { title: string; tags: string[] } | null {
  if (typeof window === 'undefined') return null;

  // 只在博客详情页提取
  const path = location.pathname;
  if (!path.match(/^\/blog\/[^/]+$/)) return null;

  // 提取标题：article 内的 h1
  const titleEl = document.querySelector('article h1');
  const title = titleEl?.textContent?.trim() || '';

  // 提取标签：标签 span 有特定样式类
  const tagSpans = document.querySelectorAll('span.bg-\\[rgb\\(var\\(--primary\\)\\/0\\.1\\)\\]');
  const tags: string[] = [];
  tagSpans.forEach((span) => {
    const text = span.textContent?.trim();
    if (text) tags.push(text);
  });

  if (!title && tags.length === 0) return null;
  return { title, tags };
}

/**
 * 获取博客上下文消息（仅在博客详情页生效）
 * @param template 消息模板，{title} 替换为标题，{tags} 替换为标签
 * @returns 格式化后的消息，非博客页或无内容时返回 null
 */
export function getArticleContextMessage(template?: string): string | null {
  if (!template) return null;
  const info = extractArticleInfo();
  if (!info || (!info.title && info.tags.length === 0)) return null;

  let msg = template.replace('{title}', info.title || '这篇博客');

  if (info.tags.length > 0) {
    const tagStr = info.tags.slice(0, 3).join('、');
    msg = msg.replace('{tags}', `，标签是${tagStr}`);
  } else {
    msg = msg.replace('{tags}', '');
  }

  return msg;
}

/**
 * 清除消息定时器
 */
export function clearMessageTimer(): void {
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }
}
