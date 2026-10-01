import React, { useEffect, useRef, useState } from 'react';
import {
  Send, LogOut, User, Search, ChevronLeft,
  Home, MessageCircle, Bot,
  Sun, Moon, Trash2, VolumeX, Volume2, Users
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import MessageBubble from '../components/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/api';
import { PublicMessage } from '../types';

const AdminPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 992);
  const [showUsersList, setShowUsersList] = useState(true);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // ===== 公共聊天状态 =====
  const [isPublicRoomSelected, setIsPublicRoomSelected] = useState(false);
  const [publicMessages, setPublicMessages] = useState<PublicMessage[]>([]);
  const [publicOnlineCount, setPublicOnlineCount] = useState(0);
  const [publicInputValue, setPublicInputValue] = useState('');
  const [publicSocket, setPublicSocket] = useState<Socket | null>(null);
  const [isMuteAll, setIsMuteAll] = useState(false);
  const publicMessagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user, logout, sendAdminMessage, aiAdminReply, messages, allUsers,
    selectedUser, selectUser, selectUserById, socket,
    unreadCounts, setActivePeer
  } = useChat();
  const { theme, toggleTheme } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    publicMessagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [publicMessages]);

  useEffect(() => {
    publicMessagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [publicMessages]);

  const handleSendMessage = () => {
    if (inputValue.trim() && selectedUser) {
      sendAdminMessage(selectedUser.id, inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendPublicMessage = () => {
    if (publicInputValue.trim() && publicSocket) {
      publicSocket.emit('publicMessage', publicInputValue.trim());
      setPublicInputValue('');
    }
  };

  const handleDeletePublicMessage = (messageId: number) => {
    if (publicSocket) {
      publicSocket.emit('adminDeletePublicMessage', { messageId });
    }
  };

  const handleToggleMuteAll = () => {
    if (publicSocket) {
      const next = !isMuteAll;
      publicSocket.emit('adminMuteAll', { enabled: next });
      setIsMuteAll(next);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (selectedUser && socket) {
      socket.emit('requestUserMessages', selectedUser.id);
      scrollToBottom();
    }
  }, [selectedUser?.id, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleAiStatus = (data: { status: string }) => {
      if (data.status === 'thinking' || data.status === 'generating') {
        setIsAiReplying(true);
      } else {
        setIsAiReplying(false);
      }
    };
    socket.on('aiStatus', handleAiStatus);
    return () => { socket.off('aiStatus', handleAiStatus); };
  }, [socket]);

  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    if (userIdParam && allUsers.length > 0) {
      const userId = parseInt(userIdParam, 10);
      selectUserById(userId).then(u => {
        if (u && isSmallScreen) setShowUsersList(false);
      });
    }
  }, [allUsers, searchParams, isSmallScreen]);

  useEffect(() => {
    const handleResize = () => {
      const newIsSmallScreen = window.innerWidth < 992;
      setIsSmallScreen(newIsSmallScreen);
      if (!newIsSmallScreen) setShowUsersList(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ===== 公共聊天 Socket =====
  useEffect(() => {
    if (!isPublicRoomSelected || !user) return;

    const newSocket = io(SOCKET_CONFIG.url, {
      ...SOCKET_CONFIG,
      autoConnect: true,
    });
    setPublicSocket(newSocket);

    // 心跳发送定时器（防止服务端 60 秒超时断开）
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('heartbeat');
        }
      }, 25000);
    };
    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    newSocket.on('connect', () => {
      let storedToken = localStorage.getItem('token');
      if (storedToken) {
        try { storedToken = JSON.parse(storedToken); } catch { /* 旧格式 */ }
        newSocket.emit('authenticate', storedToken);
      }
      newSocket.emit('requestPublicHistory', { limit: 100 });
      startHeartbeat();
    });

    newSocket.on('disconnect', () => {
      stopHeartbeat();
    });

    newSocket.on('publicHistory', (msgs: PublicMessage[]) => {
      setPublicMessages(msgs.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    });

    newSocket.on('publicMessageBroadcast', (msg: PublicMessage) => {
      setPublicMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, timestamp: new Date(msg.timestamp) }];
      });
    });

    newSocket.on('publicOnlineCount', (data: { count: number }) => {
      setPublicOnlineCount(data.count);
    });

    newSocket.on('messageDeleted', (data: { messageId: number }) => {
      setPublicMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    return () => {
      stopHeartbeat();
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('publicHistory');
      newSocket.off('publicMessageBroadcast');
      newSocket.off('publicOnlineCount');
      newSocket.off('messageDeleted');
      newSocket.disconnect();
      setPublicSocket(null);
    };
  }, [isPublicRoomSelected, user]);

  const filteredMessages = selectedUser
    ? messages.filter(msg => {
      const senderIdStr = String(msg.senderId);
      const receiverIdStr = String(msg.receiverId);
      const selectedUserIdStr = String(selectedUser.id);
      return senderIdStr === selectedUserIdStr || receiverIdStr === selectedUserIdStr;
    })
    : [];

  // 已读回执：管理员当前查看的会话变化时同步到 Context（公共聊天室 = null）
  useEffect(() => {
    setActivePeer(isPublicRoomSelected ? null : (selectedUser?.id ?? null));
  }, [selectedUser?.id, isPublicRoomSelected, setActivePeer]);

  const filteredUsers = allUsers.filter(u => {
    const nickname = u.nickname || '';
    const username = u.username || '';
    return nickname.toLowerCase().includes(searchValue.toLowerCase()) ||
      username.toLowerCase().includes(searchValue.toLowerCase());
  });

  if (!user) return null;

  return (
    <div className="flex h-screen bg-bg text-text-p overflow-hidden font-body">
      {/* 侧边栏 */}
      <aside className={`
        ${isSmallScreen && !showUsersList ? 'hidden' : 'flex'}
        flex-col w-full md:w-[320px] bg-sidebar border-r border-border
      `}>
        {/* 侧边栏头部 */}
        <div className="px-5 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">对话</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={toggleTheme} title={theme === 'light' ? '切换深色主题' : '切换浅色主题'}>
              {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim group-focus-within:text-sent" />
            <Input
              placeholder="搜索"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 bg-input-bg border-transparent focus:bg-input-bg/80 h-9 rounded-xl"
            />
          </div>
        </div>

        {/* 联系人列表 */}
        <ScrollArea className="flex-1 px-2.5 ink-scrollbar">
          <div className="space-y-0.5">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-dim">暂无对话</div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    setIsPublicRoomSelected(false);
                    selectUser(u);
                    if (isSmallScreen) setShowUsersList(false);
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('userId', u.id.toString());
                    setSearchParams(newParams);
                  }}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200
                    ${selectedUser?.id === u.id
                      ? theme === 'light' ? 'bg-black/[0.03]' : 'bg-white/[0.06]'
                      : theme === 'light' ? 'hover:bg-black/[0.03]' : 'hover:bg-white/[0.03]'
                    }
                  `}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11 shadow-md">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="bg-recv text-xs"><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-online shadow-sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-xs truncate">{u.nickname}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      {unreadCounts[u.id] > 0 && selectedUser?.id !== u.id && (
                        <Badge className="bg-sent text-sent-text h-4 min-w-[18px] px-1 text-[9px] font-bold rounded-full">
                          {unreadCounts[u.id]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

            {/* 公共聊天室入口 */}
            <div className="pt-2 mt-1 border-t border-border/50">
              <div
                onClick={() => {
                  setIsPublicRoomSelected(true);
                  if (isSmallScreen) setShowUsersList(false);
                }}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200
                  ${isPublicRoomSelected
                    ? theme === 'light' ? 'bg-black/[0.03]' : 'bg-white/[0.06]'
                    : theme === 'light' ? 'hover:bg-black/[0.03]' : 'hover:bg-white/[0.03]'
                  }
                `}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11 shadow-md">
                    <AvatarFallback className="bg-sent/10 text-sent">
                      <Users className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-xs truncate">公共聊天室</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-2xs text-text-dim">{publicOnlineCount} 人在线</span>
                  </div>
                </div>
              </div>
            </div>
        </ScrollArea>

        {/* 底部当前用户信息 */}
        <div className="p-4 border-t border-border bg-black/3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-1 ring-white/5">
              <AvatarImage src={user.avatar} />
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-text-s truncate max-w-[100px]">{user.nickname}</span>
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-text-dim hover:text-text-p" onClick={() => navigate('/')}>
              <Home className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-text-dim hover:text-red-400" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* 主聊天区域 */}
      <main className={`
        ${isSmallScreen && showUsersList ? 'hidden' : 'flex'}
        flex-1 flex-col relative
      `}>
        {isPublicRoomSelected ? (
          <>
            {/* 公共聊天头部 + 管理工具栏 */}
            <header className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border/60 bg-bg/70 backdrop-blur-xl shrink-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                {isSmallScreen && (
                  <Button variant="ghost" size="icon" className="shrink-0 text-text-s" onClick={() => setShowUsersList(true)}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                <div className="min-w-0 h-7 flex flex-col justify-center">
                  <p className="text-xs text-text-dim leading-none">{publicOnlineCount} 人在线</p>
                </div>
              </div>
              {/* 管理按钮 */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="gap-1 rounded-full h-7 text-xs text-text-s hover:text-text-p" onClick={() => setIsPublicRoomSelected(false)}>
                  <MessageCircle className="h-3 w-3" />
                  转到私聊
                </Button>
                <Button variant="ghost" size="sm" className={`gap-1 rounded-full h-7 text-xs text-text-s ${isMuteAll ? 'hover:text-green-400' : 'hover:text-red-400'}`} onClick={handleToggleMuteAll}>
                  {isMuteAll ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                  {isMuteAll ? '取消禁言' : '全员禁言'}
                </Button>
              </div>
            </header>

            {/* 公共消息列表 */}
            <ScrollArea className="flex-1 px-6 md:px-10 py-6 ink-scrollbar bg-black/[0.02]">
              <div className="max-w-4xl mx-auto space-y-4">
                {publicMessages.map((msg) => {
                  const senderId = msg.user_id ?? 0;
                  const isOwn = msg.user_id === user.id;
                  return (
                    <div key={msg.id} className="group relative">
                      <MessageBubble
                        message={{
                          id: String(msg.id),
                          senderId,
                          receiverId: 0,
                          content: msg.content,
                          timestamp: msg.timestamp,
                          isRead: true,
                          fromAi: msg.from_ai,
                        }}
                        isOwn={isOwn}
                        senderAvatar={msg.avatar || undefined}
                      />
                      {/* Hover delete button */}
                      <button
                        onClick={() => handleDeletePublicMessage(msg.id)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex hover:bg-red-600 transition-colors z-10"
                        title="删除消息"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}
                <div ref={publicMessagesEndRef} />
              </div>
            </ScrollArea>

            {/* 公共聊天输入 */}
            <div className="px-2 py-4 md:px-10 md:pb-8 bg-bg/95 backdrop-blur-xl border-t border-border">
              <div className="max-w-4xl mx-auto flex items-end gap-3">
                <Textarea
                  value={publicInputValue}
                  onChange={(e) => setPublicInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.nativeEvent as any).isComposing) return;
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendPublicMessage();
                    }
                  }}
                  placeholder="发送消息...（管理员身份）"
                  className="flex-1 min-h-[40px] max-h-[150px] bg-input-bg border border-border text-sm leading-relaxed rounded-xl py-1.5 px-4 focus-visible:ring-1 focus-visible:ring-sent/30"
                  rows={1}
                />
                <Button
                  onClick={handleSendPublicMessage}
                  disabled={!publicInputValue.trim()}
                  className={`shrink-0 h-10 w-10 rounded-full p-0 transition-all ${publicInputValue.trim() ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : selectedUser ? (
          <>
            {/* 聊天头部 */}
            <header className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border/60 bg-bg/70 backdrop-blur-xl shrink-0 z-10">
              <div className="flex items-end gap-2.5 min-w-0">
                {isSmallScreen && (
                  <Button variant="ghost" size="icon" className="shrink-0 text-text-s" onClick={() => setShowUsersList(true)}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 ring-1 ring-border/50">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="bg-muted text-text-s">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg shadow-sm transition-colors duration-300 ${selectedUser.isOnline ? 'bg-online' : 'bg-text-dim'}`} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold leading-tight truncate">{selectedUser.nickname}</h2>
                  <p className={`text-3xs leading-snug transition-colors duration-300 ${selectedUser.isOnline ? 'text-online' : 'text-text-dim'}`}>
                    {selectedUser.isOnline ? '在线' : '离线'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => aiAdminReply(selectedUser.id)}
                disabled={isAiReplying}
                className={`shrink-0 gap-2 rounded-full px-4 h-8 text-xs font-medium transition-colors ${
                  isAiReplying
                    ? 'bg-accent text-white hover:bg-accent'
                    : 'text-text-s hover:text-text-p hover:bg-muted'
                }`}
              >
                {isAiReplying ? (
                  <Bot className="h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{isAiReplying ? '生成中...' : 'AI 回复'}</span>
              </Button>
            </header>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 px-6 md:px-10 py-6 ink-scrollbar bg-black/[0.02]">
              <div className="max-w-4xl mx-auto space-y-4">
                {filteredMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id ?? `${msg.senderId}-${msg.timestamp}`}
                    message={msg}
                    isOwn={Number(msg.senderId) === Number(user.id)}
                    senderAvatar={Number(msg.senderId) === Number(user.id) ? user.avatar : selectedUser.avatar}
                    showReadReceipt
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 输入区域 */}
            <div className="px-2 py-4 md:px-10 md:pb-8 bg-bg/95 backdrop-blur-xl border-t border-border">
              <div className="max-w-4xl mx-auto flex items-end gap-3">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="发送消息..."
                  className="flex-1 min-h-[40px] max-h-[150px] bg-input-bg border border-border text-sm leading-relaxed rounded-xl py-1.5 px-4 focus-visible:ring-1 focus-visible:ring-sent/30"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className={`shrink-0 h-10 w-10 rounded-full p-0 transition-all ${inputValue.trim() ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-dim space-y-4">
            <div className="h-20 w-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
              <MessageCircle className="h-10 w-10 opacity-20" />
            </div>
            <p className="text-sm font-medium tracking-wide">选择一段对话以开始</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
