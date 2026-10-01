import React from 'react';

interface PublicChatHeaderProps {
  onlineCount: number;
  actions?: React.ReactNode;
}

const PublicChatHeader: React.FC<PublicChatHeaderProps> = ({ onlineCount, actions }) => {
  return (
    <header className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border/60 bg-bg/70 backdrop-blur-xl shrink-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold leading-tight">公共聊天室</h2>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center h-9 text-xs text-text-dim">
          {onlineCount} 人在线
        </div>
        {actions}
      </div>
    </header>
  );
};

export default PublicChatHeader;
