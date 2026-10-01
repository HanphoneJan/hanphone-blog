import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PublicMessage } from '../types';

interface PublicMessageItemProps {
  message: PublicMessage;
  isOwn: boolean;
  showTime: boolean;
  isGroupEnd: boolean;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const PublicMessageItem: React.FC<PublicMessageItemProps> = ({
  message,
  isOwn,
  showTime,
  isGroupEnd,
}) => {
  const bubbleRadius = 'rounded-[12px]';
  const marginClass = isGroupEnd ? 'mb-4' : 'mb-3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${marginClass}`}
    >
      <div className={`flex max-w-[80%] items-start gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/30">
          <AvatarImage src={message.avatar || undefined} />
          <AvatarFallback className="bg-recv text-text-dim">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} min-w-0`}>
          {/* 昵称行 */}
          <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-2xs font-medium text-text-dim">{message.nickname}</span>
          </div>

          {/* 气泡 */}
          <div
            className={`
              im-bubble relative flex items-center
              ${isOwn
                ? 'bg-sent text-sent-text'
                : 'bg-recv text-recv-text'
              }
              ${bubbleRadius}
            `}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>

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

export default PublicMessageItem;
