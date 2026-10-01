import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { Avatar, AvatarImage,AvatarFallback } from '@/components/ui/avatar';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderAvatar?: string;
  showTime?: boolean;
  isGroupEnd?: boolean;
  isLoading?: boolean;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderAvatar,
  showTime = true,
  isGroupEnd = true,
  isLoading = false,
}) => {
  const isAiMessage = message.fromAi || false;

  const bubbleRadius = 'rounded-[12px]';

  // 组内间距：非组末条消息缩小间距
  const marginClass = isGroupEnd ? 'mb-4' : 'mb-3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${marginClass}`}
    >
      <div className={`flex max-w-[80%] items-start gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* 头像 — 始终显示，与气泡顶部对齐 */}
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/30">
          <AvatarImage src={senderAvatar} />
          <AvatarFallback className="bg-recv text-text-dim">
            {isAiMessage ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>

        {/* 消息内容 */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} min-w-0`}>
          {/* 气泡 */}
          <div
            className={`
              im-bubble relative flex items-center
              ${isOwn
                ? 'bg-sent text-sent-text'
                : isAiMessage
                  ? 'bg-recv text-recv-text border border-border/40'
                  : 'bg-recv text-recv-text'
              }
              ${bubbleRadius}
            `}
          >
            {isLoading ? (
              <div className="flex items-center gap-1.5 py-1 px-0.5">
                <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-current opacity-40" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-current opacity-40" style={{ animationDelay: '200ms' }} />
                <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-current opacity-40" style={{ animationDelay: '400ms' }} />
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>

          {/* 时间 — 仅组末条显示 */}
          {showTime && (
            <div className="mt-1 px-1">
              <span className="text-3xs text-text-dim">{formatTime(new Date(message.timestamp))}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
