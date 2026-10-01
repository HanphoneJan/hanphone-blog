import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Send, LogOut, User, Bot, Users,
  Home, Sparkles, ChevronLeft, Mic, MicOff, Sun, Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '@/components/ui/toast';
import MessageBubble from '../components/MessageBubble';
import { authService } from '../utils/authService';
import { Message } from '../types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

// ===== 辅助函数 =====

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

function formatTimeSeparator(d: Date): string {
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// ===== 消息展示项类型 =====

type DisplayItem =
  | { key: string; type: 'date-separator'; text: string }
  | { key: string; type: 'time-separator'; text: string }
  | { key: string; type: 'message'; message: Message; isOwn: boolean; isGroupStart: boolean; isGroupEnd: boolean };

// ===== 时间/日期分隔符组件 =====

const ChatSeparator: React.FC<{ type: 'date' | 'time'; text: string }> = ({ type, text }) => (
  <div className="flex items-center justify-center my-3">
    {type === 'time' ? (
      <span className="text-3xs text-text-dim/70 px-2">{text}</span>
    ) : (
      <span className="text-2xs text-text-dim/80 font-medium bg-muted/40 px-3 py-0.5 rounded-full">{text}</span>
    )}
  </div>
);

const ChatPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ nickname: string; avatar: string; isOnline: boolean }>({ nickname: '管理员', avatar: '', isOnline: false });
  const [isAiMode, setIsAiMode] = useState(() => {
    return localStorage.getItem('chat_aiMode') === 'true';
  });
  const [loadingAiMessageId, setLoadingAiMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, sendMessage, messages, loadHistoryMessages, token, socket } = useChat();
  const { theme, toggleTheme } = useTheme();
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingAiMessageId]);

  useEffect(() => {
    if (!socket) return;
    const handleAiStreamStart = (data: { tempId: string }) => {
      setLoadingAiMessageId(data.tempId);
    };
    const handleAiStreamChunk = (data: { tempId: string }) => {
      setLoadingAiMessageId(prev => prev === data.tempId ? null : prev);
    };
    const handleAdminOnlineStatus = (data: { isOnline: boolean }) => {
      setAdminInfo(prev => ({ ...prev, isOnline: data.isOnline }));
    };
    socket.on('aiStreamStart', handleAiStreamStart);
    socket.on('aiStreamChunk', handleAiStreamChunk);
    socket.on('adminOnlineStatus', handleAdminOnlineStatus);
    return () => {
      socket.off('aiStreamStart', handleAiStreamStart);
      socket.off('aiStreamChunk', handleAiStreamChunk);
      socket.off('adminOnlineStatus', handleAdminOnlineStatus);
    };
  }, [socket, loadingAiMessageId]);

  useEffect(() => {
    if (user) loadHistoryMessages();
  }, [user?.id]);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      if (!token) return;
      try {
        const response = await authService.getAdminUserInfo(token);
        if (response.success && response.user) {
          setAdminInfo({
            nickname: response.user.nickname || '管理员',
            avatar: response.user.avatar || '',
            isOnline: response.user.isOnline || false,
          });
        }
      } catch (error) {
        console.error('获取管理员头像时出错:', error);
      }
    };
    fetchAdminInfo();
  }, [token]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      try {
        sendMessage(inputValue, isAiMode);
        setInputValue('');
      } catch (error) {
        showToast('发送失败', 'error');
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('chat_aiMode', String(isAiMode));
  }, [isAiMode]);

  const toggleMode = () => {
    setIsAiMode(!isAiMode);
    showToast(isAiMode ? '已切换到真人模式' : '已切换到AI模式', 'info');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      showToast('您的浏览器不支持语音识别', 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'zh-CN';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => prev + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          showToast('语音识别出错', 'error');
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // ===== 获取发送者头像 =====
  const getSenderAvatar = (msg: Message): string => {
    // 管理员 (ID=1000) 使用 adminInfo 头像
    if (Number(msg.senderId) === 1000) return adminInfo.avatar;
    // 自己的消息用自己头像
    if (Number(msg.senderId) === Number(user!.id)) return user!.avatar;
    // 其他发送者（如AI）使用接收者头像
    return user!.avatar;
  };

  // ===== 消息分组计算 =====
  const displayItems = useMemo<DisplayItem[]>(() => {
    const items: DisplayItem[] = [];
    if (!user) return items;

    let prevMsg: Message | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isAiStream = !!(msg.tempId && msg.content === '');

      // 分组判断
      const isNewSender = !prevMsg || Number(msg.senderId) !== Number(prevMsg.senderId);
      const isDiffAi = !prevMsg || msg.fromAi !== prevMsg.fromAi;
      const timeGap = prevMsg ? msg.timestamp.getTime() - prevMsg.timestamp.getTime() : Infinity;
      const isBigTimeGap = timeGap > 5 * 60 * 1000;
      const isNewDay = prevMsg && !isSameDay(new Date(msg.timestamp), new Date(prevMsg.timestamp));
      const isGroupStart = !prevMsg || isNewSender || isDiffAi || isBigTimeGap || isAiStream;

      // 日期分隔符
      if (isNewDay) {
        items.push({ key: `date-${msg.id}`, type: 'date-separator', text: formatDateSeparator(new Date(msg.timestamp)) });
      }
      // 时间分隔符（同日但间隔 >5分钟）
      if (isBigTimeGap && !isNewDay) {
        items.push({ key: `time-${msg.id}`, type: 'time-separator', text: formatTimeSeparator(new Date(msg.timestamp)) });
      }

      const isOwn = Number(msg.senderId) === Number(user.id);
      items.push({
        key: msg.id,
        type: 'message',
        message: msg,
        isOwn,
        isGroupStart,
        isGroupEnd: false, // 第二遍标记
      });

      prevMsg = msg;
    }

    // 第二遍：标记每条消息 run 的最后一条为 isGroupEnd
    for (let i = 0; i < items.length; i++) {
      if (items[i].type !== 'message') continue;
      let j = i;
      while (j + 1 < items.length && items[j + 1].type === 'message') j++;
      (items[j] as Extract<DisplayItem, { type: 'message' }>).isGroupEnd = true;
      i = j;
    }

    return items;
  }, [messages, user?.id]);

  if (!user) return null;

  return (
    <div className="flex h-screen flex-col bg-bg overflow-hidden text-text-p">

      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border/60 bg-bg/70 backdrop-blur-xl shrink-0 z-10">
        {/* Left: chat partner info */}
        <div className="flex items-end gap-2.5 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-text-s" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 ring-1 ring-border/50">
              <AvatarImage src={adminInfo.avatar} />
              <AvatarFallback className="bg-muted text-text-s">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg shadow-sm transition-colors duration-300 ${adminInfo.isOnline ? 'bg-online' : 'bg-text-dim'}`} />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate">{adminInfo.nickname}</h2>
            <p className={`text-3xs leading-snug transition-colors duration-300 ${adminInfo.isOnline ? 'text-online' : 'text-text-dim'}`}>
              {adminInfo.isOnline ? '在线' : '离线'}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            className={`rounded-full transition-colors text-text-s hover:text-text-p`}
            title={isAiMode ? '切换到真人模式' : '切换到AI模式'}
          >
            {isAiMode ? <Bot className="h-[18px] w-[18px]" /> : <Users className="h-[18px] w-[18px]" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full text-text-s hover:text-text-p"
            title={theme === 'light' ? '切换深色主题' : '切换浅色主题'}
          >
            {theme === 'light' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-text-s hover:text-text-p" onClick={() => navigate('/')} title="首页">
            <Home className="h-[18px] w-[18px]" />
          </Button>
          <div className="w-px h-5 bg-border/50 mx-1" />
          <Button variant="ghost" size="icon" className="rounded-full text-text-s hover:text-red-400" onClick={handleLogout} title="退出登录">
            <LogOut className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </header>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 ink-scrollbar">
        <div className="px-4 py-4 md:px-8 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex h-[60vh] items-center justify-center opacity-10">
              <Sparkles className="h-12 w-12" />
            </div>
          ) : (
            <div>
              {displayItems.map((item) => {
                if (item.type === 'date-separator') {
                  return <ChatSeparator key={item.key} type="date" text={item.text} />;
                }
                if (item.type === 'time-separator') {
                  return <ChatSeparator key={item.key} type="time" text={item.text} />;
                }
                // type === 'message'
                return (
                  <MessageBubble
                    key={item.key}
                    message={item.message}
                    isOwn={item.isOwn}
                    senderAvatar={getSenderAvatar(item.message)}
                    showTime={item.isGroupEnd}
                    isGroupEnd={item.isGroupEnd}
                    isLoading={item.message.fromAi && item.message.tempId === loadingAiMessageId}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="px-4 py-4 md:px-8 md:pb-6 border-t border-border bg-bg/95 backdrop-blur-xl shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoiceInput}
            className={`shrink-0 h-[38px] w-[38px] rounded-full ${isListening ? 'bg-sent text-sent-text' : 'text-text-s'}`}
          >
            {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <div className="flex-1 relative group">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? '倾听中...' : '输入消息...'}
              className="min-h-[38px] max-h-[120px] rounded-2xl bg-input-bg border border-border focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-1.5 text-xs leading-relaxed"
              rows={1}
            />
          </div>

          <Button
            variant="mobile_primary"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className={`shrink-0 h-[38px] w-[38px] rounded-full p-0 flex items-center justify-center transition-all ${
              inputValue.trim() ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'
            }`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
