'use client';

/**
 * Live2D 消息显示模块
 */

import { randomSelection, i18n, getSessionStorageInt, setSessionStorage, removeSessionStorage } from './utils';
import { TimeConfig } from './types';

let messageTimer: NodeJS.Timeout | null = null;

export type MessageCallback = (text: string, timeout: number, priority: number) => void;

let messageHandler: MessageCallback | null = null;

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
): void {
  const currentPriority = getSessionStorageInt('waifu-message-priority', 0);
  
  if (
    !text ||
    (override && currentPriority > priority) ||
    (!override && currentPriority >= priority)
  ) {
    return;
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
 * 清除消息定时器
 */
export function clearMessageTimer(): void {
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }
}
