'use client';

/**
 * Live2D Widget 主组件
 * 整合所有Live2D功能，替代原有的iframe方案
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Baby } from 'lucide-react';
import { Live2DConfig, TipsConfig } from '../types';
import { Live2DContainer } from './Live2DContainer';
import { getLocalStorage, setLocalStorage } from '../utils';
import logger from '../logger';

// 默认模型配置
const DEFAULT_MODELS = [
  {
    path: '/live2d/models/mimi/迷迷挂件.model3.json',
    name: '迷迷',
    message: '你好呀！我是迷迷~',
  },
  {
    path: '/live2d/models/ariu/ariu.model3.json',
    name: 'Ariu',
    message: '我是Ariu~',
  },
];

// 默认提示配置
const DEFAULT_TIPS: TipsConfig = {
  message: {
    default: ['欢迎来到我的博客！', '今天也要元气满满哦~', '有什么我可以帮你的吗？'],
    console: '哈哈，你打开了控制台，是想要看看我的秘密吗？',
    copy: '你都复制了些什么呀，转载要记得注明出处哦~',
    visibilitychange: '你回来啦~',
    changeSuccess: '新衣服好看吗？',
    changeFail: '这个模型只有一种纹理呢~',
    photo: '要拍照留念吗？',
    goodbye: '再见啦~要常来看我哦！',
    hitokoto: '——来自 $1，by $2',
    welcome: '欢迎来到 $1',
    referrer: '你从 $1 来到这里，欢迎！',
    hoverBody: ['让我看看是谁在碰我~', '哎呀，好痒~'],
    tapBody: ['你戳我干嘛？', '再戳我就要生气了哦~'],
  },
  time: [
    { hour: '6-7', text: '早上好！一日之计在于晨，美好的一天就要开始了。' },
    { hour: '8-11', text: '上午好！工作顺利嘛，不要久坐，多起来走动走动哦！' },
    { hour: '12-13', text: '中午了，工作了一个上午，现在是午餐时间！' },
    { hour: '14-17', text: '午后很容易犯困呢，今天的运动目标完成了吗？' },
    { hour: '18-19', text: '傍晚了！窗外夕阳的景色很美丽呢，最美不过夕阳红~' },
    { hour: '20-21', text: '晚上好，今天过得怎么样？' },
    { hour: '22-23', text: '已经这么晚了呀，早点休息吧，晚安~' },
    { hour: '0-5', text: '这么晚还不睡吗？当心熬夜秃头哦！' },
  ],
  mouseover: [
    { selector: 'a[href^="/blog"]', text: '要看看文章吗？' },
    { selector: '.search-button', text: '想要查找点什么？' },
    { selector: 'a[href^="/admin"]', text: '这里是管理后台入口' },
  ],
  click: [
    { selector: 'a[href^="/blog"]', text: '点击了博客链接呢' },
    { selector: 'button[type="submit"]', text: '提交表单要小心哦' },
  ],
  seasons: [
    { date: '1/1', text: '元旦快乐！新的一年要天天开心哦~' },
    { date: '2/14', text: '情人节快乐！愿天下有情人终成眷属~' },
    { date: '5/1', text: '劳动节快乐！工作辛苦了，好好休息一下吧~' },
    { date: '6/1', text: '儿童节快乐！要保持一颗童心哦~' },
    { date: '10/1', text: '国庆节快乐！祝祖国繁荣昌盛~' },
    { date: '12/25', text: '圣诞节快乐！🎄' },
  ],
  models: DEFAULT_MODELS,
};

interface Live2DWidgetProps {
  config?: Partial<Live2DConfig>;
  tips?: TipsConfig;
  models?: Array<{ path: string; name?: string; message?: string }>;
}

export function Live2DWidget({ config = {}, tips, models }: Live2DWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showToggle, setShowToggle] = useState(false);

  const finalModels = models || DEFAULT_MODELS;
  const finalTips = tips || DEFAULT_TIPS;
  const finalConfig: Live2DConfig = {
    drag: true,
    logLevel: 'info',
    tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'quit'],
    ...config,
  };

  // 检查是否应该隐藏
  useEffect(() => {
    const displayTime = getLocalStorage('waifu-display');
    if (displayTime) {
      const elapsed = Date.now() - Number(displayTime);
      if (elapsed <= 86400000) { // 24小时内
        setIsHidden(true);
        setIsFirstTime(true);
        setShowToggle(true);
      }
    }
    
    // 延迟加载
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // 切换显示状态
  const handleToggle = useCallback(() => {
    setShowToggle(false);
    if (isFirstTime) {
      setIsHidden(false);
      setIsFirstTime(false);
    } else {
      setLocalStorage('waifu-display', '');
      setIsHidden(false);
      setTimeout(() => {
        setIsLoaded(true);
      }, 0);
    }
  }, [isFirstTime]);

  // 关闭回调
  const handleClose = useCallback(() => {
    setIsHidden(true);
    setShowToggle(true);
    setIsFirstTime(false);
  }, []);

  // 如果正在加载或隐藏，显示切换按钮
  if (showToggle) {
    return (
      <button
        onClick={handleToggle}
        className="fixed left-0 bottom-16 z-[9999] flex items-center justify-center
          w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-r-lg
          shadow-lg transition-all duration-300 cursor-pointer
          -ml-8 hover:-ml-2"
        title="显示看板娘"
      >
        <Baby size={24} />
      </button>
    );
  }

  // 如果隐藏或未加载，不显示
  if (isHidden || !isLoaded) {
    return null;
  }

  return (
    <Live2DContainer
      config={finalConfig}
      tips={finalTips}
      models={finalModels}
      onClose={handleClose}
    />
  );
}

export default Live2DWidget;
