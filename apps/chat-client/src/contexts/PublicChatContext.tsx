import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { PublicMessage, PublicChatContextType } from '../types';
import { SOCKET_CONFIG } from '../config/api';
import { authService } from '../utils/authService';

const PublicChatContext = createContext<PublicChatContextType | undefined>(undefined);

function getTokenFromStorage(): string | null {
  const t = localStorage.getItem('token');
  if (!t || t === 'null' || t === 'undefined') return null;
  try {
    const parsed = JSON.parse(t);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    // 旧格式纯字符串
    return t;
  }
}

function getUserFromStorage() {
  try {
    const u = localStorage.getItem('userInfo');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export const PublicChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  // 用 ref 存储 user，确保 sendPublicMessage 回调始终能读取最新值
  const userRef = useRef(getUserFromStorage());

  // ===== Socket connection =====
  useEffect(() => {
    const storedToken = getTokenFromStorage();

    const newSocket = io(SOCKET_CONFIG.url, {
      ...SOCKET_CONFIG,
      autoConnect: true,
    });
    setSocket(newSocket);

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
      console.log('[PublicChat] Socket connected, hasToken:', !!storedToken);
      if (storedToken) {
        newSocket.emit('authenticate', storedToken);
      }
      newSocket.emit('requestPublicHistory', { limit: 100 });
      startHeartbeat();
    });

    newSocket.on('disconnect', () => {
      stopHeartbeat();
    });

    newSocket.on('publicHistory', (msgs: PublicMessage[]) => {
      setMessages(msgs.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })));
    });

    newSocket.on('publicMessageBroadcast', (msg: PublicMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, timestamp: new Date(msg.timestamp) }];
      });
    });

    newSocket.on('publicOnlineCount', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    newSocket.on('messageDeleted', (data: { messageId: number }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    newSocket.on('notification', (message: string) => {
      console.log('[PublicChat] Notification:', message);
    });

    return () => {
      stopHeartbeat();
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('publicHistory');
      newSocket.off('publicMessageBroadcast');
      newSocket.off('publicOnlineCount');
      newSocket.off('messageDeleted');
      newSocket.off('notification');
      newSocket.disconnect();
    };
  }, []); // Run once on mount; token/user read from localStorage at runtime via getTokenFromStorage/getUserFromStorage

  // ===== Send public message =====
  const sendPublicMessage = (content: string) => {
    if (!socket) {
      console.warn('[PublicChat] Cannot send message: socket not connected');
      return;
    }
    if (!userRef.current) {
      console.warn('[PublicChat] Cannot send message: user not logged in');
      return;
    }
    console.log('[PublicChat] Sending publicMessage:', content);
    socket.emit('publicMessage', content);
  };

  // ===== Load public history via HTTP =====
  const loadPublicHistory = async () => {
    try {
      const storedToken = getTokenFromStorage();
      const response = await authService.getPublicHistory(storedToken, 100);
      if (response.success) {
        setMessages(response.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      }
    } catch (error) {
      console.error('加载公共聊天历史失败:', error);
    }
  };

  const value: PublicChatContextType = {
    messages,
    onlineCount,
    sendPublicMessage,
    loadPublicHistory,
  };

  return (
    <PublicChatContext.Provider value={value}>
      {children}
    </PublicChatContext.Provider>
  );
};

export const usePublicChat = () => {
  const context = useContext(PublicChatContext);
  if (context === undefined) {
    throw new Error('usePublicChat must be used within a PublicChatProvider');
  }
  return context;
};