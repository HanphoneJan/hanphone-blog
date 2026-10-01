import React, { useState } from 'react';
import { Send, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PublicChatInputProps {
  onSend: (content: string) => void;
  isLoggedIn: boolean;
}

const PublicChatInput: React.FC<PublicChatInputProps> = ({ onSend, isLoggedIn }) => {
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();

  const handleSend = () => {
    if (inputValue.trim()) {
      onSend(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="px-4 py-4 md:px-8 md:pb-6 border-t border-border bg-bg/95 backdrop-blur-xl shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <p className="text-sm text-text-dim">登录后参与聊天</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login?redirect=/public')}
            className="gap-1.5 text-sent hover:text-sent/80"
          >
            <LogIn className="h-4 w-4" />
            去登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-8 md:pb-6 border-t border-border bg-bg/95 backdrop-blur-xl shrink-0">
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        <div className="flex-1 relative group">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入消息... (@寒枫 召唤AI)"
            className="min-h-[38px] max-h-[120px] rounded-2xl bg-input-bg border border-border focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-1.5 text-xs leading-relaxed"
            rows={1}
          />
        </div>
        <Button
          variant="mobile_primary"
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className={`shrink-0 h-[38px] w-[38px] rounded-full p-0 flex items-center justify-center transition-all ${
            inputValue.trim() ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'
          }`}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PublicChatInput;
