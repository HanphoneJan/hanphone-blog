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
import { TIME } from '@/lib/constants';

// 默认模型配置
const DEFAULT_MODELS = [
  {
    path: '/live2d/models/mimi/\u8ff7\u8ff7\u6302\u4ef6.model3.json',
    name: '\u8ff7\u8ff7',
    message: '\u4f60\u597d\u5440\uff01\u6211\u662f\u8ff7\u8ff7~',
  },
  {
    path: '/live2d/models/ariu/ariu.model3.json',
    name: 'Ariu',
    message: '\u6211\u662fAriu~',
  },
];

// 默认提示配置
const DEFAULT_TIPS: TipsConfig = {
  message: {
    default: ['\u6b22\u8fce\u6765\u5230\u6211\u7684\u535a\u5ba2\uff01', '\u4eca\u5929\u4e5f\u8981\u5143\u6c14\u6ee1\u6ee1\u54e6~', '\u6709\u4ec0\u4e48\u6211\u53ef\u4ee5\u5e2e\u4f60\u7684\u5417\uff1f'],
    console: '\u54c8\u54c8\uff0c\u4f60\u6253\u5f00\u4e86\u63a7\u5236\u53f0\uff0c\u662f\u60f3\u8981\u770b\u770b\u6211\u7684\u79d8\u5bc6\u5417\uff1f',
    copy: '\u4f60\u90fd\u590d\u5236\u4e86\u4e9b\u4ec0\u4e48\u5440\uff0c\u8f6c\u8f7d\u8981\u8bb0\u5f97\u6ce8\u660e\u51fa\u5904\u54e6~',
    visibilitychange: '\u4f60\u56de\u6765\u5566~',
    changeSuccess: '\u65b0\u8863\u670d\u597d\u770b\u5417\uff1f',
    changeFail: '\u8fd9\u4e2a\u6a21\u578b\u53ea\u6709\u4e00\u79cd\u7eb9\u7406\u5462~',
    photo: '\u8981\u62cd\u7167\u7559\u5ff5\u5417\uff1f',
    goodbye: '\u518d\u89c1\u5566~\u8981\u5e38\u6765\u770b\u6211\u54e6\uff01',
    hitokoto: '\u2014\u2014\u6765\u81ea $1\uff0cby $2',
    welcome: '\u6b22\u8fce\u6765\u5230 $1',
    referrer: '\u4f60\u4ece $1 \u6765\u5230\u8fd9\u91cc\uff0c\u6b22\u8fce\uff01',
    hoverBody: ['\u8ba9\u6211\u770b\u770b\u662f\u8c01\u5728\u78b0\u6211~', '\u54e6\u54e6\uff0c\u597d\u75d2~'],
    tapBody: ['\u4f60\u6233\u6211\u5e72\u5417\uff1f', '\u518d\u6233\u6211\u5c31\u8981\u751f\u6c14\u4e86\u54e6~'],
  },
  time: [
    { hour: '6-7', text: '\u65e9\u4e0a\u597d\uff01\u4e00\u65e5\u4e4b\u8ba1\u5728\u4e8e\u6668\uff0c\u7f8e\u597d\u7684\u4e00\u5929\u5c31\u8981\u5f00\u59cb\u4e86\u3002' },
    { hour: '8-11', text: '\u4e0a\u5348\u597d\uff01\u5de5\u4f5c\u987a\u5229\u561b\uff0c\u4e0d\u8981\u4e45\u5750\uff0c\u591a\u8d77\u6765\u8d70\u52a8\u8d70\u52a8\u54e6~' },
    { hour: '12-13', text: '\u4e2d\u5348\u4e86\uff0c\u5de5\u4f5c\u4e86\u4e00\u4e2a\u4e0a\u5348\uff0c\u73b0\u5728\u662f\u5348\u9910\u65f6\u95f4\uff01' },
    { hour: '14-17', text: '\u5348\u540e\u5f88\u5bb9\u6613\u72af\u56f0\u5462\uff0c\u4eca\u5929\u7684\u8fd0\u52a8\u76ee\u6807\u5b8c\u6210\u4e86\u5417\uff1f' },
    { hour: '18-19', text: '\u508d\u665a\u4e86\uff01\u7a97\u5916\u5915\u9633\u7684\u666f\u8272\u5f88\u7f8e\u4e3d\u5462\uff0c\u6700\u7f8e\u4e0d\u8fc7\u5915\u9633\u7ea2~' },
    { hour: '20-21', text: '\u665a\u4e0a\u597d\uff0c\u4eca\u5929\u8fc7\u5f97\u600e\u4e48\u6837\uff1f' },
    { hour: '22-23', text: '\u5df2\u7ecf\u8fd9\u4e48\u665a\u4e86\u5440\uff0c\u65e9\u70b9\u4f11\u606f\u5427\uff0c\u665a\u5b89~' },
    { hour: '0-5', text: '\u8fd9\u4e48\u665a\u8fd8\u4e0d\u7761\u5417\uff1f\u5f53\u5fc3\u71ac\u591c\u79c3\u5934\u54e6\uff01' },
  ],
  mouseover: [
    { selector: 'a[href^="/blog"]', text: '\u8981\u770b\u770b\u6587\u7ae0\u5417\uff1f' },
    { selector: '.search-button', text: '\u60f3\u8981\u67e5\u627e\u70b9\u4ec0\u4e48\uff1f' },
    { selector: 'a[href^="/admin"]', text: '\u8fd9\u91cc\u662f\u7ba1\u7406\u540e\u53f0\u5165\u53e3' },
  ],
  click: [
    { selector: 'a[href^="/blog"]', text: '\u70b9\u51fb\u4e86\u535a\u5ba2\u94fe\u63a5\u5462' },
    { selector: 'button[type="submit"]', text: '\u63d0\u4ea4\u8868\u5355\u8981\u5c0f\u5fc3\u54e6' },
  ],
  seasons: [
    { date: '1/1', text: '\u5143\u65e6\u5feb\u4e50\uff01\u65b0\u7684\u4e00\u5e74\u8981\u5929\u5929\u5f00\u5fc3\u54e6~' },
    { date: '2/14', text: '\u60c5\u4eba\u8282\u5feb\u4e50\uff01\u613f\u5929\u4e0b\u6709\u60c5\u4eba\u7ec8\u6210\u5377\u5c5e~' },
    { date: '5/1', text: '\u52b3\u52a8\u8282\u5feb\u4e50\uff01\u5de5\u4f5c\u8f9b\u82e6\u4e86\uff0c\u597d\u597d\u4f11\u606f\u4e00\u4e0b\u5427~' },
    { date: '6/1', text: '\u513f\u7ae5\u8282\u5feb\u4e50\uff01\u8981\u4fdd\u6301\u4e00\u9897\u7ae5\u5fc3\u54e6~' },
    { date: '10/1', text: '\u56fd\u5e86\u8282\u5feb\u4e50\uff01\u795d\u7956\u56fd\u7e41\u8363\u660c\u76db~' },
    { date: '12/25', text: '\u5723\u8bde\u8282\u5feb\u4e50\uff01\ud83c\udf84' },
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

  // \u68c0\u67e5\u662f\u5426\u5e94\u8be5\u9690\u85cf
  useEffect(() => {
    const displayTime = getLocalStorage('waifu-display');
    if (displayTime) {
      const elapsed = Date.now() - Number(displayTime);
      if (elapsed <= 86400000) { // 24\u5c0f\u65f6\u5185
        setIsHidden(true);
        setIsFirstTime(true);
        setShowToggle(true);
      }
    }

    // \u5ef6\u8fdf\u52a0\u8f7d
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, TIME.ALERT_INIT_DELAY);

    return () => clearTimeout(timer);
  }, []);

  // \u5207\u6362\u663e\u793a\u72b6\u6001
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

  // \u5173\u95ed\u56de\u8c03
  const handleClose = useCallback(() => {
    setIsHidden(true);
    setShowToggle(true);
    setIsFirstTime(false);
  }, []);

  // \u5982\u679c\u6b63\u5728\u52a0\u8f7d\u6216\u9690\u85cf\uff0c\u663e\u793a\u5207\u6362\u6309\u94ae
  if (showToggle) {
    return (
      <button
        onClick={handleToggle}
        className="fixed left-0 bottom-16 z-[9999] flex items-center justify-center
          w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-r-lg
          shadow-lg transition-all duration-300 cursor-pointer
          -ml-8 hover:-ml-2"
        title="\u663e\u793a\u770b\u677f\u5a18"
      >
        <Baby size={24} />
      </button>
    );
  }

  // \u5982\u679c\u9690\u85cf\u6216\u672a\u52a0\u8f7d\uff0c\u4e0d\u663e\u793a
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
