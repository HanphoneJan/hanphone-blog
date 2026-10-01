import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Message, ChatContextType, ServerToClientEvents, ClientToServerEvents } from '../types';
import { authService } from '../utils/authService';
import { SOCKET_CONFIG } from '../config/api';

// 创建聊天上下文
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// 提供者组件
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]); // 所有用户列表（管理员使用）
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({}); // 管理员收件箱未读数
  const loadMessagesSeqRef = useRef<number>(0); // 用于防止消息加载竞态
  // 已读回执：管理员当前正查看的会话用户 / 普通用户是否在聊天页
  const activePeerIdRef = useRef<number | null>(null);
  const chatPageActiveRef = useRef<boolean>(false);
  // 消息去重 + 未读去重：React StrictMode 双调 setState updater 时保证每条消息只计一次
  const handledMessageIdsRef = useRef<Set<string>>(new Set());

  // 初始化，从localStorage获取用户信息
  useEffect(() => {
    let storedToken = localStorage.getItem('token');
    // 兼容旧版本纯字符串 token，新版本统一用 JSON.stringify 存储
    if (storedToken) {
      try {
        const parsed = JSON.parse(storedToken);
        storedToken = typeof parsed === 'string' ? parsed : null;
      } catch {
        // 旧格式纯字符串，直接保留
      }
    }
    // 空字符串视为无效
    if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
      storedToken = null;
    }
    console.log('初始化时获取的token:', storedToken);
    const storedUser = localStorage.getItem('userInfo');

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
      } catch (error) {
        console.error('解析用户数据失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
      }
    }
  }, []);

  // 初始化Socket连接
  useEffect(() => {
    if (token && user) {
      const newSocket = io(SOCKET_CONFIG.url, SOCKET_CONFIG);
      setSocket(newSocket);

      // 心跳发送定时器
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

      // 连接成功后进行认证
      newSocket.on('connect', () => {
        console.log('Socket连接成功，开始认证');
        newSocket.emit('authenticate', token);
        startHeartbeat();

        // 如果是管理员，加载按最新消息时间排序的用户列表 + 未读数
        if (user.type === '1') {
          loadAllUsersSorted();
          loadUnreadCounts();
        }
      });

      // 监听连接错误
      newSocket.on('connect_error', (error) => {
        console.error('Socket连接错误:', error);
      });

      // 断线时停止心跳
      newSocket.on('disconnect', () => {
        stopHeartbeat();
      });

      // 监听服务器消息
      newSocket.on('message', (message: Message) => {
        // 将Date字符串转换为Date对象
        const processedMessage = {
          ...message,
          timestamp: new Date(message.timestamp)
        };

        // 已读回执/未读数：仅对首次到达的新消息计一次（StrictMode 双调 updater 也不会重复计数）
        const idKey = String(processedMessage.id);
        if (!handledMessageIdsRef.current.has(idKey)) {
          handledMessageIdsRef.current.add(idKey);
          if (user.type === '1') {
            const senderId = Number(processedMessage.senderId);
            if (senderId !== 1000 && senderId !== user.id) {
              if (activePeerIdRef.current === senderId) {
                // 正在查看该用户会话 → 立即标记已读并清零未读（对方收到回执）
                newSocket.emit('markConversationRead', senderId);
                setUnreadCounts(prev => ({ ...prev, [senderId]: 0 }));
              } else {
                // 未在查看 → 未读 +1
                setUnreadCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
              }
            }
          } else if (user.type === '0' && chatPageActiveRef.current && Number(processedMessage.senderId) === 1000) {
            // 普通用户在聊天页查看时，管理员/AI 发来的消息立即标记已读
            newSocket.emit('markConversationRead', 1000);
          }
        }

        // 检查消息是否已存在
        setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg.id === processedMessage.id);
          if (messageExists) {
            return prevMessages;
          }

          // 检查是否是客户端临时消息的确认（同 senderId + 同 content）
          const tempIndex = prevMessages.findIndex(
            msg => typeof msg.id === 'string' && msg.id.startsWith('temp-') &&
                   msg.senderId === processedMessage.senderId &&
                   msg.content === processedMessage.content
          );
          if (tempIndex !== -1) {
            // 用服务器确认的消息替换临时消息
            return prevMessages.map((msg, idx) =>
              idx === tempIndex ? processedMessage : msg
            );
          }

          // 添加新消息
          if (user.type === '0') {
            // 普通用户只接收来自管理员的消息或自己发送的消息
            const shouldShowMessage =
              processedMessage.senderId.toString() === '1000' || // 来自管理员
              processedMessage.senderId === user.id; // 自己发送的消息

            return shouldShowMessage ? [...prevMessages, processedMessage] : prevMessages;
          } else if (user.type === '1') {
            // 管理员接收所有消息
            return [...prevMessages, processedMessage];
          }
          return prevMessages;
        });
      });

      // 已读回执：对方读了你发出的消息 → 把自己发出的旧消息标记已读
      newSocket.on('conversationRead', (data: { peerUserId: number; readUpToMessageId: number }) => {
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            const isMineToPeer =
              Number(msg.senderId) === Number(user.id) &&
              Number(msg.receiverId) === Number(data.peerUserId);
            if (isMineToPeer && Number(msg.id) <= Number(data.readUpToMessageId)) {
              return { ...msg, isRead: true };
            }
            return msg;
          })
        );
      });

      // 监听AI流式消息开始
      newSocket.on('aiStreamStart', (data: { tempId: string, senderId: number, receiverId: number, fromAi: boolean }) => {
        const tempMessage: Message = {
          id: data.tempId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: '',
          timestamp: new Date(),
          isRead: false,
          fromAi: data.fromAi,
          tempId: data.tempId
        };
        setMessages(prev => [...prev, tempMessage]);
      });

      // 监听AI流式消息片段
      newSocket.on('aiStreamChunk', (data: { tempId: string, content: string }) => {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === data.tempId || msg.tempId === data.tempId) {
              return {
                ...msg,
                content: msg.content + data.content,
                tempId: data.tempId
              };
            }
            return msg;
          });
        });
      });

      // 监听AI流式消息结束
      newSocket.on('aiStreamEnd', (data: { tempId: string, content: string }) => {
        // 流式结束，移除tempId标记,将消息转为正式消息
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === data.tempId || msg.tempId === data.tempId) {
              const { tempId, ...messageWithoutTempId } = msg;
              return {
                ...messageWithoutTempId,
                content: data.content
              };
            }
            return msg;
          });
        });
      });

      // 监听AI流式消息错误
      newSocket.on('aiStreamError', (data: { tempId: string, error: string }) => {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === data.tempId || msg.tempId === data.tempId) {
              const { tempId: _t, ...msgWithoutTempId } = msg;
              return {
                ...msgWithoutTempId,
                content: msg.content + '\n[错误: ' + data.error + ']'
              };
            }
            return msg;
          });
        });
      });

      // 监听AI完整消息（替换临时消息）- 不再使用,流式传输后直接保存
      // newSocket.on('aiMessageComplete', (message: Message) => {
      //   // 已废弃,改用aiStreamEnd处理
      // });

      // 监听用户连接
      newSocket.on('userConnected', (connectedUser: User) => {
        setOnlineUsers(prev => {
          // 检查用户是否已在列表中
          const userExists = prev.some(u => u.id === connectedUser.id);
          if (userExists) {
            // 更新现有用户
            return prev.map(u => u.id === connectedUser.id ? { ...connectedUser, isOnline: true } : u);
          }
          // 添加新用户
          return [...prev, { ...connectedUser, isOnline: true }];
        });
      });

      // 监听用户断开连接
      newSocket.on('userDisconnected', (userId: number) => {
        setOnlineUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, isOnline: false } : u)
        );
      });

      // 监听用户列表更新
      newSocket.on('userListUpdated', (users: User[]) => {
        setOnlineUsers(users.map(u => ({ ...u, isOnline: true })));
      });

      // 监听错误
      newSocket.on('error', (error: string) => {
        console.error('Socket错误:', error);
      });

      // 组件卸载时显式移除所有监听器再断开连接
      return () => {
        stopHeartbeat();
        newSocket.off('connect');
        newSocket.off('connect_error');
        newSocket.off('disconnect');
        newSocket.off('message');
        newSocket.off('conversationRead');
        newSocket.off('aiStreamStart');
        newSocket.off('aiStreamChunk');
        newSocket.off('aiStreamEnd');
        newSocket.off('aiStreamError');
        newSocket.off('userConnected');
        newSocket.off('userDisconnected');
        newSocket.off('userListUpdated');
        newSocket.off('error');
        newSocket.disconnect();
      };
    }
  }, [token, user]);

  // 登录函数
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await authService.login(username, password);
      
      if (result.flag && result.data?.token && result.data?.user) {
        setToken(result.data.token);
        setUser(result.data.user);
        localStorage.setItem('token', JSON.stringify(result.data.token));
        localStorage.setItem('userInfo', JSON.stringify(result.data.user));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('登录错误:', error);
      return false;
    }
  };

  // 直接设置用户信息的函数（用于已经通过API验证的情况）
  const setUserFromLogin = (user: User, token: string) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', JSON.stringify(token));
    localStorage.setItem('userInfo', JSON.stringify(user));
  };

  // 登出函数
  const logout = () => {
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setUser(null);
    setToken(null);
    setMessages([]);
    setOnlineUsers([]);
    setAllUsers([]);
    setUnreadCounts({});
    setSelectedUser(null);
    activePeerIdRef.current = null;
    chatPageActiveRef.current = false;
    handledMessageIdsRef.current.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
  };

  // 加载历史消息
  const loadHistoryMessages = async () => {
    if (!user || !token) return;
    
    try {
      if (user.type === '0') {
        // 普通用户加载与管理员的聊天记录
        const response = await authService.getMessagesWithAdmin(token);
        
        if (response && response.success) {
          // 将Date字符串转换为Date对象
          const processedMessages = response.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          setMessages(processedMessages);
        } else {
          console.error('加载历史消息失败:', response?.message);
        }
      }
      // 管理员不在这里加载历史消息，而是在选择用户时加载
    } catch (error) {
      console.error('加载历史消息时出错:', error);
    }
  };

  // 加载按最新消息时间排序的用户列表（管理员使用）
  const loadAllUsersSorted = async () => {
    if (!user || !token || user.type !== '1') return;
    
    try {
      const response = await authService.getUsersSortedByLatestMessage(token);
      
      if (response.success) {
        // 为每个用户添加在线状态标记
        const usersWithStatus = response.users.map((userItem: User & { latestMessageTime?: Date }) => {
          const isOnline = onlineUsers.some(onlineUser => onlineUser.id === userItem.id);
          return { ...userItem, isOnline };
        });
        
        setAllUsers(usersWithStatus);
      } else {
        console.error('加载排序用户列表失败:', response.message);
      }
    } catch (error) {
      console.error('加载排序用户列表时出错:', error);
    }
  };

  // 加载管理员收件箱未读数（管理员使用）
  const loadUnreadCounts = async () => {
    if (!user || !token || user.type !== '1') return;

    try {
      const response = await authService.getUnreadCounts(token);
      if (response.success) {
        const map: Record<number, number> = {};
        (response.unread || []).forEach((item: { userId: number; count: number }) => {
          map[Number(item.userId)] = Number(item.count) || 0;
        });
        setUnreadCounts(map);
      }
    } catch (error) {
      console.error('加载未读数列表时出错:', error);
    }
  };

  // 进入会话标记已读：本地清零未读 + 通知服务端
  const markConversationRead = (peerUserId: number) => {
    if (socket && socket.connected) {
      socket.emit('markConversationRead', peerUserId);
    }
    setUnreadCounts(prev => ({ ...prev, [peerUserId]: 0 }));
  };

  // 管理员当前正在查看的会话（公共聊天室/未选用户传 null）
  const setActivePeer = (userId: number | null) => {
    activePeerIdRef.current = userId;
  };

  // 普通用户是否正在聊天页查看会话
  const setChatPageActive = (active: boolean) => {
    chatPageActiveRef.current = active;
  };

  // 发送消息（用户发送给管理员或AI）
  const sendMessage = (content: string, toAi: boolean = false) => {
    if (!socket) {
      throw new Error('网络连接已断开');
    }
    
    if (!content.trim()) {
      throw new Error('消息内容不能为空');
    }
    
    if (!user) {
      throw new Error('用户未登录');
    }
    
    if (user.type !== '0') {
      throw new Error('只有普通用户可以发送消息');
    }
    
    try {
      // 创建唯一的临时ID用于乐观更新
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 立即在UI上显示消息（乐观更新）
      const tempMessage: Message = {
        id: tempId,
        senderId: user.id,
        receiverId: 1000, // 管理员ID
        content,
        timestamp: new Date(),
        isRead: false,
        toAi
      };
      
      setMessages(prev => [...prev, tempMessage]);

      // 发送到服务器
      socket.emit('userMessage', content, tempId, toAi);

      // 10秒后检查临时消息是否被确认，如未被确认则标记为发送失败
      setTimeout(() => {
        setMessages(prevMessages => {
          const stillTemp = prevMessages.some(
            msg => msg.id === tempId
          );
          if (stillTemp) {
            return prevMessages.map(msg =>
              msg.id === tempId
                ? { ...msg, content: msg.content + ' [发送失败]' }
                : msg
            );
          }
          return prevMessages;
        });
      }, 10000);
    } catch (error) {
      console.error('发送消息时出错:', error);
      throw error;
    }
  };

  // 发送管理员消息（管理员发送给用户）
  const sendAdminMessage = (userId: number, content: string) => {
    if (socket && content.trim() && user && user.type === '1') {
      // 发送到服务器
      socket.emit('adminMessage', userId, content);
    }
  };

  // AI代管理员回复
  const aiAdminReply = (userId: number) => {
    if (socket && user && user.type === '1') {
      socket.emit('aiAdminReply', userId);
    }
  };

  // 选择用户（管理员功能）
  const selectUser = async (selected: User) => {
    // 先更新选中的用户
    setSelectedUser(selected);
    // 标记该会话已读（服务端写库 + 未读清零）
    markConversationRead(selected.id);
    // 然后加载与该用户的聊天记录
    await loadUserMessages(selected.id);
  };

  // 通过ID选择用户（用于URL参数）
  const selectUserById = async (userId: number) => {
    if (!allUsers.length) {
      console.warn('用户列表尚未加载，无法通过ID选择用户');
      return null;
    }
    const user = allUsers.find(u => String(u.id) === String(userId));
    if (user) {
      await selectUser(user);
      return user;
    } else {
      console.warn(`未找到ID为${userId}的用户`);
      return null;
    }
  };

  // 加载与用户的聊天记录
  const loadUserMessages = async (userId: number) => {
    if (!user || !token || user.type !== '1') return;

    // 递增序列号，用于忽略过期的请求结果
    const currentSeq = ++loadMessagesSeqRef.current;

    try {
      // 调用API获取历史消息
      const response = await authService.getMessagesWithUser(userId ,token);

      // 如果在此期间发起了新的请求，忽略这个结果
      if (currentSeq !== loadMessagesSeqRef.current) {
        console.log('loadUserMessages - 忽略过期请求结果');
        return;
      }

      console.log('loadUserMessages - API响应:', response);

      if (response.success) {
        // 将Date字符串转换为Date对象
        const processedMessages = response.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        console.log('loadUserMessages - 处理后的消息:', processedMessages);
        console.log('loadUserMessages - 当前selectedUser ID:', userId);

        // 清空当前消息列表，然后设置新的消息
        setMessages(processedMessages);
      } else {
        console.error('加载聊天记录失败:', response.message);
      }
    } catch (error) {
      console.error('加载聊天记录时出错:', error);
    }
  };

  const value: ChatContextType = {
    user,
    token,
    socket,
    messages,
    onlineUsers,
    allUsers,
    unreadCounts,
    selectedUser,
    login,
    logout,
    sendMessage,
    sendAdminMessage,
    aiAdminReply,
    selectUser,
    selectUserById,
    loadHistoryMessages,
    setUserFromLogin,
    loadAllUsersSorted,
    markConversationRead,
    setActivePeer,
    setChatPageActive
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// 自定义Hook，用于使用聊天上下文
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};