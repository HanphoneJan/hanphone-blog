import React from 'react';

// 聊天消息分组/日期/时间展示模型（私有会话与公共聊天室共用，规则对齐 ChatPage/Android 端）
// - 连续同发送者、同 fromAi、间隔 ≤5 分钟 → 成组（昵称只在组首、时间只在组末）
// - 跨天插日期胶囊（今天/昨天/X月X日 周X）；同日间隔 >5 分钟插时间分隔

export interface ChatDisplaySource {
  key: string;
  senderId: number | null;
  fromAi: boolean;
  timestamp: Date;
  forceGroupStart?: boolean; // 流式临时气泡强制自成一组
}

export type ChatDisplayItem =
  | { key: string; type: 'date-separator'; text: string }
  | { key: string; type: 'time-separator'; text: string }
  | { key: string; type: 'message'; msgKey: string; isGroupStart: boolean; isGroupEnd: boolean };

const GROUP_GAP_MS = 5 * 60 * 1000;

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateSeparator(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, today)) return '今天';
  if (isSameDay(d, yesterday)) return '昨天';
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
}

export function formatTimeSeparator(d: Date): string {
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/** 最后活跃时间文案（对齐 QQ/Telegram）：刚刚 / N分钟前 / N小时前 / N天前 / X月X日 */
export function formatLastSeen(epochMs: number | null | undefined): string {
  if (!epochMs || epochMs <= 0) return '离线';
  const diff = Date.now() - epochMs;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  const d = new Date(epochMs);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function buildChatDisplay(messages: ChatDisplaySource[]): ChatDisplayItem[] {
  const items: ChatDisplayItem[] = [];
  if (!messages.length) return items;

  let prev: ChatDisplaySource | null = null;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    let groupStart = !prev;

    if (prev) {
      const isNewDay = !isSameDay(msg.timestamp, prev.timestamp);
      const isBigGap = msg.timestamp.getTime() - prev.timestamp.getTime() > GROUP_GAP_MS;
      const newGroup =
        prev.senderId !== msg.senderId || prev.fromAi !== msg.fromAi || isBigGap || isNewDay || !!msg.forceGroupStart;

      if (isNewDay) {
        items.push({ key: `date-${msg.key}`, type: 'date-separator', text: formatDateSeparator(msg.timestamp) });
      } else if (isBigGap) {
        items.push({ key: `time-${msg.key}`, type: 'time-separator', text: formatTimeSeparator(msg.timestamp) });
      }
      groupStart = newGroup;
    }

    items.push({ key: `msg-${msg.key}`, type: 'message', msgKey: msg.key, isGroupStart: groupStart, isGroupEnd: false });
    prev = msg;
  }

  // 组末标记：以 groupStart 为边界，每个组的最后一条为 groupEnd
  for (let i = 0; i < items.length; i++) {
    if (items[i].type !== 'message') continue;
    let j = i;
    let next: ChatDisplayItem | undefined = items[j + 1];
    while (next && next.type === 'message' && !next.isGroupStart) {
      j += 1;
      next = items[j + 1];
    }
    (items[j] as Extract<ChatDisplayItem, { type: 'message' }>).isGroupEnd = true;
    i = j;
  }

  return items;
}

/** 日期/时间分隔组件：日期胶囊（今天/昨天/X月X日）带圆底、时间分隔居中无背景 */
export const ChatSeparator: React.FC<{ type: 'date' | 'time'; text: string }> = ({ type, text }) => (
  <div className="flex items-center justify-center my-3">
    {type === 'time' ? (
      <span className="text-3xs text-text-dim/70 px-2">{text}</span>
    ) : (
      <span className="text-2xs text-text-dim/80 font-medium bg-muted/40 px-3 py-0.5 rounded-full">{text}</span>
    )}
  </div>
);