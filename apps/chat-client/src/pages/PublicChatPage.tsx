import React from 'react';
import { Home, Sun, Moon, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { PublicChatProvider, usePublicChat } from '../contexts/PublicChatContext';
import PublicChatHeader from '../components/PublicChatHeader';
import PublicMessageList from '../components/PublicMessageList';
import PublicChatInput from '../components/PublicChatInput';
import { Button } from '@/components/ui/button';

const PublicChatContent: React.FC = () => {
  const { messages, onlineCount, sendPublicMessage } = usePublicChat();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const user = (() => {
    try {
      const u = localStorage.getItem('userInfo');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const isLoggedIn = !!user;
  const currentUserId: number | null = user ? user.id : null;

  return (
    <div className="flex h-screen flex-col bg-bg overflow-hidden text-text-p">
      {/* Header bar */}
      <PublicChatHeader
        onlineCount={onlineCount}
        actions={
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full text-text-s hover:text-text-p"
              title={theme === 'light' ? '切换深色主题' : '切换浅色主题'}
            >
              {theme === 'light' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            {isLoggedIn && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-text-s hover:text-text-p"
                onClick={() => navigate('/chat')}
                title="转到私聊"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-full text-text-s hover:text-text-p" onClick={() => navigate('/')} title="首页">
              <Home className="h-[18px] w-[18px]" />
            </Button>
          </div>
        }
      />

      {/* Message list */}
      <PublicMessageList
        messages={messages}
        currentUserId={currentUserId}
      />

      {/* Input area */}
      <PublicChatInput onSend={sendPublicMessage} isLoggedIn={isLoggedIn} />
    </div>
  );
};

const PublicChatPage: React.FC = () => {
  return (
    <PublicChatProvider>
      <PublicChatContent />
    </PublicChatProvider>
  );
};

export default PublicChatPage;
