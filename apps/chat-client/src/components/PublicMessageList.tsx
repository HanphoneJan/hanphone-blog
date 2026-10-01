import React, { useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import PublicMessageItem from './PublicMessageItem';
import { PublicMessage } from '../types';

interface PublicMessageListProps {
  messages: PublicMessage[];
  currentUserId: number | null;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDateSeparator(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, today)) return '今天';
  if (isSameDay(d, yesterday)) return '昨天';
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
}

type DisplayItem =
  | { key: string; type: 'date-separator'; text: string }
  | { key: string; type: 'message'; message: PublicMessage; isOwn: boolean; isGroupStart: boolean; isGroupEnd: boolean };

const PublicMessageList: React.FC<PublicMessageListProps> = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    const items: DisplayItem[] = [];
    if (messages.length === 0) return items;

    let prevMsg: PublicMessage | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isNewSender = !prevMsg || msg.user_id !== prevMsg.user_id || msg.from_ai !== prevMsg.from_ai;
      const timeGap = prevMsg ? msg.timestamp.getTime() - prevMsg.timestamp.getTime() : Infinity;
      const isBigTimeGap = timeGap > 5 * 60 * 1000;
      const isNewDay = !prevMsg || !isSameDay(new Date(msg.timestamp), new Date(prevMsg.timestamp));
      const isGroupStart = !prevMsg || isNewSender || isBigTimeGap;

      if (isNewDay) {
        items.push({ key: `date-${msg.id}-${i}`, type: 'date-separator', text: formatDateSeparator(new Date(msg.timestamp)) });
      }

      const isOwn = currentUserId !== null && msg.user_id === currentUserId;

      items.push({
        key: `msg-${msg.id}-${i}`,
        type: 'message',
        message: msg,
        isOwn,
        isGroupStart,
        isGroupEnd: false,
      });

      prevMsg = msg;
    }

    // Second pass: mark isGroupEnd
    for (let i = 0; i < items.length; i++) {
      if (items[i].type !== 'message') continue;
      let j = i;
      while (j + 1 < items.length && items[j + 1].type === 'message') j++;
      (items[j] as Extract<DisplayItem, { type: 'message' }>).isGroupEnd = true;
      i = j;
    }

    return items;
  }, [messages, currentUserId]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim text-sm">暂无消息，来打个招呼吧~</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 ink-scrollbar">
      <div className="px-4 py-4 md:px-8 max-w-4xl mx-auto">
        {displayItems.map(item => {
          if (item.type === 'date-separator') {
            return (
              <div key={item.key} className="flex items-center justify-center my-3">
                <span className="text-2xs text-text-dim/80 font-medium bg-muted/40 px-3 py-0.5 rounded-full">{item.text}</span>
              </div>
            );
          }
          return (
            <PublicMessageItem
              key={item.key}
              message={item.message}
              isOwn={item.isOwn}
              showTime={item.isGroupEnd}
              isGroupEnd={item.isGroupEnd}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default PublicMessageList;
