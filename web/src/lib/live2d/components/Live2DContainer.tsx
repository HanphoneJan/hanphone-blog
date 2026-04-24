'use client';

/**
 * Live2D 容器组件
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Live2DConfig, TipsConfig, MessageConfig } from '../types';
import { useDrag, useLive2DModel } from '../hooks';
import { showMessage, setMessageHandler, clearMessageTimer, welcomeMessage } from '../message';
import { getLocalStorage, setLocalStorage, randomSelection } from '../utils';
import logger from '../logger';
import { MessageCircle, User, Shirt, X, Camera } from 'lucide-react';
import {  TIME , LIVE2D } from '@/lib/constants';

interface Live2DContainerProps {
  config: Live2DConfig;
  tips?: TipsConfig;
  models: Array<{ path: string; name?: string; message?: string }>;
  onClose?: () => void;
}

// 工具按钮配置
interface ToolButton {
  id: string;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}

export function Live2DContainer({ config, tips, models, onClose }: Live2DContainerProps) {
  const [message, setMessage] = useState('');
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messagePriority, setMessagePriority] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  
  // 拖拽功能
  const {
    position,
    setPosition,
    isDragging,
    elementRef,
    handleMouseDown,
    handleTouchStart,
  } = useDrag({
    enabled: config.drag ?? true,
    initialPosition: { x: 0, y: 0 },
  });
  
  // 在客户端计算右下角位置
  useEffect(() => {
    setPosition({
      x: Math.max(0, window.innerWidth - 260),
      y: Math.max(0, window.innerHeight - 380),
    });
  }, [setPosition]);

  // Live2D 模型加载
  const {
    canvasRef,
    isLoading: modelLoading,
    isLoaded,
    isReady,
    currentModelIndex,
    loadModel,
    setCurrentModelIndex,
  } = useLive2DModel({
    models: models.map(m => ({ path: m.path, name: m.name })),
    initialModelIndex: 0,
    onLoad: () => {
      logger.info('Live2D model loaded successfully');
    },
    onError: (error) => {
      logger.error('Failed to load Live2D model:', error);
    },
  });

  // 初始加载 - 只在 isReady 变为 true 时执行一次
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (isReady && !hasInitializedRef.current && models.length > 0) {
      hasInitializedRef.current = true;
      loadModel(models[currentModelIndex].path);
    }
  }, [isReady, models, currentModelIndex, loadModel]);

  // 切换模型时加载
  const handleSwitchModel = useCallback(() => {
    const nextId = (currentModelIndex + 1) % models.length;
    setCurrentModelIndex(nextId);
    loadModel(models[nextId].path);
    if (models[nextId].message) {
      showMessage(models[nextId].message, 4000, 10);
    }
  }, [currentModelIndex, models, loadModel, setCurrentModelIndex]);

  // 消息处理器
  useEffect(() => {
    setMessageHandler((text: string, timeout: number, priority: number) => {
      setMessage(text);
      setMessagePriority(priority);
      setShowMessageBox(true);
      
      setTimeout(() => {
        setShowMessageBox(false);
      }, timeout);
    });
    
    return () => {
      setMessageHandler(() => {});
      clearMessageTimer();
    };
  }, []);

  // 初始化欢迎消息
  useEffect(() => {
    if (!tips) return;
    
    // 延迟显示欢迎消息
    const timer = setTimeout(() => {
      const welcome = welcomeMessage(
        tips.time,
        tips.message.welcome,
        tips.message.referrer
      );
      if (welcome) {
        showMessage(welcome, 7000, 11);
      }
    }, TIME.ALERT_DURATION);
    
    return () => clearTimeout(timer);
  }, [tips]);

  // 注册事件监听器
  useEffect(() => {
    if (!tips) return;

    // 用户活动检测
    let userAction = false;
    let userActionTimer: NodeJS.Timeout | null = null;
    const messageArray = [...tips.message.default];
    
    // 季节消息
    tips.seasons.forEach(({ date, text }) => {
      const now = new Date();
      const after = date.split('-')[0];
      const before = date.split('-')[1] || after;
      
      if (
        Number(after.split('/')[0]) <= now.getMonth() + 1 &&
        now.getMonth() + 1 <= Number(before.split('/')[0]) &&
        Number(after.split('/')[1]) <= now.getDate() &&
        now.getDate() <= Number(before.split('/')[1])
      ) {
        const seasonText = randomSelection(text).replace('{year}', String(now.getFullYear()));
        messageArray.push(seasonText);
      }
    });

    // 检测用户活动
    const handleActivity = () => {
      userAction = true;
    };

    // 空闲时显示消息
    const activityInterval = setInterval(() => {
      if (userAction) {
        userAction = false;
        if (userActionTimer) {
          clearInterval(userActionTimer);
          userActionTimer = null;
        }
      } else if (!userActionTimer && messageArray.length > 0) {
        userActionTimer = setInterval(() => {
          showMessage(messageArray, 6000, 9);
        }, 20000);
      }
    }, 1000);

    // 鼠标悬停事件
    let lastHoverElement: string | null = null;
    const handleMouseOver = (event: MouseEvent) => {
      for (const { selector, text } of tips.mouseover) {
        if (!(event.target as HTMLElement)?.closest(selector)) continue;
        if (lastHoverElement === selector) return;
        lastHoverElement = selector;
        
        const msg = randomSelection(text).replace('{text}', (event.target as HTMLElement).innerText);
        showMessage(msg, 4000, 8);
        return;
      }
    };

    // 点击事件
    const handleClick = (event: MouseEvent) => {
      for (const { selector, text } of tips.click) {
        if (!(event.target as HTMLElement)?.closest(selector)) continue;
        
        const msg = randomSelection(text).replace('{text}', (event.target as HTMLElement).innerText);
        showMessage(msg, 4000, 8);
        return;
      }
    };

    // Live2D特定事件
    const handleHoverBody = () => {
      showMessage(tips.message.hoverBody, 4000, 8, false);
    };

    const handleTapBody = () => {
      showMessage(tips.message.tapBody, 4000, 9);
    };

    // 复制事件
    const handleCopy = () => {
      showMessage(tips.message.copy, 6000, 9);
    };

    // 可见性变化
    const handleVisibility = () => {
      if (!document.hidden) {
        showMessage(tips.message.visibilitychange, 6000, 9);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('click', handleClick);
    window.addEventListener('live2d:hoverbody', handleHoverBody);
    window.addEventListener('live2d:tapbody', handleTapBody);
    window.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('live2d:hoverbody', handleHoverBody);
      window.removeEventListener('live2d:tapbody', handleTapBody);
      window.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(activityInterval);
      if (userActionTimer) clearInterval(userActionTimer);
    };
  }, [tips]);

  // 一言API
  const fetchHitokoto = useCallback(async () => {
    try {
      const response = await fetch('https://v1.hitokoto.cn');
      const result = await response.json();
      showMessage(result.hitokoto, 6000, 9);
      
      if (tips?.message.hitokoto) {
        setTimeout(() => {
          const template = tips.message.hitokoto;
          const text = template.replace(/\$(\d+)/g, (_, idx) => {
            const i = parseInt(idx, 10) - 1;
            return [result.from, result.creator][i] ?? '';
          });
          showMessage(text, 4000, 9);
        }, 6000);
      }
    } catch (error) {
      logger.error('Failed to fetch hitokoto:', error);
    }
  }, [tips]);

  // 拍照功能 - 使用 PIXI extract 正确捕获图像
  const takePhoto = useCallback(async () => {
    if (!canvasRef.current || isPhotoLoading) return;
    
    setIsPhotoLoading(true);
    showMessage(tips?.message.photo || '拍照中...', 6000, 9);
    
    try {
      // 获取 PIXI 应用实例
      const app = (canvasRef.current as any).__pixi;
      if (app && app.renderer) {
        // 使用 PIXI 的 extract 插件捕获图像
        const image = await app.renderer.extract.image(app.stage);
        const dataUrl = (image as HTMLImageElement).src;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `live2d-photo-${Date.now()}.png`;
        link.click();
      } else {
        // 降级方案：直接捕获 canvas
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `live2d-photo-${Date.now()}.png`;
        link.click();
      }
    } catch (error) {
      logger.error('Failed to take photo:', error);
    } finally {
      setIsPhotoLoading(false);
    }
  }, [tips, isPhotoLoading]);

  // 关闭功能
  const handleClose = useCallback(() => {
    setLocalStorage('waifu-display', Date.now().toString());
    showMessage(tips?.message.goodbye || '再见啦~', 2000, 11);
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, TIME.ALERT_DURATION);
  }, [tips, onClose]);

  // 切换纹理（暂不支持）
  const handleSwitchTexture = useCallback(() => {
    showMessage(tips?.message.changeFail || '没有可切换的纹理', 4000, 10);
  }, [tips]);

  // 工具按钮
  const tools: ToolButton[] = [
    {
      id: 'hitokoto',
      icon: <MessageCircle size={18} />,
      onClick: fetchHitokoto,
      title: '一言',
    },
    {
      id: 'switch-model',
      icon: <User size={18} />,
      onClick: handleSwitchModel,
      title: '切换模型',
    },
    {
      id: 'switch-texture',
      icon: <Shirt size={18} />,
      onClick: handleSwitchTexture,
      title: '切换纹理',
    },
    {
      id: 'photo',
      icon: <Camera size={18} />,
      onClick: takePhoto,
      title: '拍照',
    },
    {
      id: 'quit',
      icon: <X size={18} />,
      onClick: handleClose,
      title: '关闭',
    },
  ];

  if (!isVisible) return null;

  return (
    <div
      ref={elementRef}
      className={`fixed z-[9999] transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        left: position.x,
        top: position.y,
        transform: isDragging ? 'none' : 'translateY(25px)',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* 消息气泡 */}
      <div
        className={`absolute -top-8 left-5 bg-pink-50/90 border-2 border-pink-200 rounded-2xl px-3 py-2 
          shadow-lg text-sm text-gray-700 max-w-[160px] min-h-[30px] transition-all duration-200
          ${showMessageBox ? 'opacity-100' : 'opacity-0'}`}
        style={{
          animation: showMessageBox ? 'none' : 'waifu-shake 50s ease-in-out 5s infinite',
        }}
        dangerouslySetInnerHTML={{ __html: message }}
      />

      {/* Canvas容器 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          id="live2d"
          width={LIVE2D.DEFAULT_WIDTH}
          height={LIVE2D.DEFAULT_HEIGHT}
          className="cursor-grab active:cursor-grabbing rounded-lg"
          style={{ width: LIVE2D.DEFAULT_WIDTH, height: LIVE2D.DEFAULT_HEIGHT }}
        />
        
      </div>

      {/* 工具栏 - 移到模型外部右侧偏下 */}
      <div className="absolute -right-10 bottom-16 flex flex-col gap-1 opacity-0 hover:opacity-100 transition-opacity duration-300">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={(e) => {
              e.stopPropagation();
              tool.onClick();
            }}
            className="p-1.5 text-gray-500 hover:text-cyan-600 transition-colors duration-200 hover:scale-110"
            title={tool.title}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
