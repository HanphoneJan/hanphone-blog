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
import { showMessage, getPageSpecificWelcome, getArticleContextMessage } from '../message';
import { TIME, LIVE2D } from '@/lib/constants';

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
    hoverBody: ['让我看看是谁在碰我~', '哦哦，好痒~'],
    tapBody: ['你戳我干嘛？', '再戳我就要生气了哦~'],
    scrollDepth: [
      '你已经读了三分之一了，加油~',
      '已经看了这么多啦，快读完了！',
      '读完啦！有什么感想吗？记得评论哦~',
    ],
    commentFocus: ['想说点什么吗？我也有同感~', '评论区交给你啦！'],
    articleContext: '这篇《{title}》看起来很有意思呢{tags}~',
  },
  time: [
    { hour: '6-7', text: '早上好！一日之计在于晨，美好的一天就要开始了。' },
    { hour: '8-11', text: '上午好！工作顺利嘛，不要久坐，多起来走动走动哦~' },
    { hour: '12-13', text: '中午了，工作了一个上午，现在是午餐时间！' },
    { hour: '14-17', text: '午后很容易犯困呢，今天的运动目标完成了吗？' },
    { hour: '18-19', text: '傍晚了！窗外夕阳的景色很美丽呢，最美不过夕阳红~' },
    { hour: '20-21', text: '晚上好，今天过得怎么样？' },
    { hour: '22-23', text: '已经这么晚了呀，早点休息吧，晚安~' },
    { hour: '0-5', text: '这么晚还不睡吗？当心熬夜秃头哦！' },
  ],
  mouseover: [
    // ===== 页面专属配置（优先匹配，仅对特定路由生效） =====
    // 项目页
    { selector: 'a[target="_blank"] h3', pages: ['/projects'],
      dynamicText: (el) => {
        const title = el.textContent?.trim();
        return title ? `"${title}" 看起来很有意思~` : null;
      }, oncePerElement: true },
    { selector: '.project-card .flex-wrap', pages: ['/projects'],
      dynamicText: (el) => {
        const techs: string[] = [];
        for (const child of el.children) {
          const t = child.textContent?.trim();
          if (t && t.length <= 20) techs.push(t);
        }
        return techs.length > 0 ? `${techs.slice(0, 3).join('、')} 都可以了解一下！` : null;
      }, oncePerElement: true },
    // 友链页
    { selector: '.links-apply-btn', pages: ['/links'], text: '想和我交换友链吗？点击这里申请~', oncePerElement: true },
    { selector: '.links-card', pages: ['/links'],
      dynamicText: (el) => {
        const name = el.querySelector('h3')?.textContent?.trim();
        return name ? `去看看「${name}」的网站吧~` : '去看看吧~';
      }, oncePerElement: true },
    // 随笔页
    { selector: '.essay-card', pages: ['/essays'],
      dynamicText: (el) => {
        const preview = el.querySelector('.whitespace-pre-line')?.textContent?.trim().slice(0, 15);
        return preview ? `这篇随笔写到"${preview}..." 挺有意思的~` : '看看这篇随笔写了什么吧~';
      }, oncePerElement: true },
    // 留言页
    { selector: '.msg-btn', pages: ['/messages'], text: '写完留言就发布吧~', oncePerElement: true },
    { selector: '.msg-root', pages: ['/messages'],
      dynamicText: (el) => {
        const preview = el.querySelector('.msg-content')?.textContent?.trim().slice(0, 15);
        return preview ? `有人留言说"${preview}..." 你也来说两句吧~` : '你也来说两句吧~';
      }, oncePerElement: true },
    // 文档详情页
    { selector: '.doc-sidebar-item', pages: ['/docs/'], text: '左侧目录可以帮你快速跳转章节哦~', oncePerElement: true },
    // 关于页 - 分区滚动
    { selector: '#about-hero', pages: ['/about'], text: '这是寒枫的个人主页~', oncePerElement: true },
    { selector: '#about-skills', pages: ['/about'], text: '这些是寒枫掌握的技能~', oncePerElement: true },
    { selector: '#about-works', pages: ['/about'], text: '来看看寒枫的作品集吧~', oncePerElement: true },
    { selector: '#about-hobbies', pages: ['/about'], text: '兴趣爱好也很广泛呢~', oncePerElement: true },
    { selector: '#about-evaluations', pages: ['/about'], text: '这是大家的评价哦~', oncePerElement: true },
    { selector: '#about-contact', pages: ['/about'], text: '想联系寒枫吗？这里可以找到他~', oncePerElement: true },
    // ===== 全局配置（所有页面生效，兜底） =====
    { selector: '.blog-card', text: '要看看博客吗？' },
    { selector: '.project-card', text: '要看看项目吗？' },
    { selector: '[aria-label="搜索"]', text: '想要查找点什么？' },
    { selector: 'a[href^="/admin"]', text: '这里是管理后台入口' },
    { selector: '#parallaxHero', text: '欢迎来到云林有风，这里是我的小世界~' },
    { selector: '#scrollIndicator', text: '向下滚动，探索更多内容吧~' },
    { selector: 'nav.blog-nav-sidebar', text: '按分类浏览博客更高效哦~' },
    { selector: '.blog-filter-sidebar', text: '用标签筛选你感兴趣的内容吧~' },
    { selector: '.blog-content-prose', text: '这篇博客写得很用心呢~' },
    { selector: 'input[placeholder*="搜索项目"]', text: '搜一搜感兴趣的项目吧~' },
    { selector: 'textarea.msg-textarea', text: '有什么想说的就写下来吧~' },
    { selector: 'input[placeholder*="搜索文档"]', text: '找找需要的文档资料吧~' },
    { selector: '.doc-read-prose', text: '认真阅读文档是个好习惯~' },
    { selector: '.comment-textarea', text: '有什么感想就评论吧~' },
  ],
  click: [
    { selector: '.blog-card', text: '点击了博客链接呢' },
    { selector: 'button[type="submit"]', text: '提交表单要小心哦' },
    { selector: '#scrollIndicator', text: '好，我们往下看看~' },
    { selector: 'nav.blog-nav-sidebar a', text: '选择一个分类来筛选博客~' },
    { selector: 'textarea.msg-textarea', text: '写下来吧，我会认真看的~' },
    { selector: '.comment-textarea', text: '期待看到你的评论~' },
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
    tools: ['hitokoto', 'switch-model', 'photo', 'quit'],
    ...config,
  };

  // 检查是否应该隐藏
  useEffect(() => {
    const displayTime = getLocalStorage('waifu-display');
    if (displayTime) {
      const elapsed = Date.now() - Number(displayTime);
      if (elapsed <= LIVE2D.HIDE_DURATION) {
        setIsHidden(true);
        setIsFirstTime(true);
        setShowToggle(true);
      }
    }

    // 延迟加载
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, TIME.ALERT_INIT_DELAY);

    return () => clearTimeout(timer);
  }, []);

  // 模型加载完成后，发送页面特定欢迎消息 + 博客上下文消息
  useEffect(() => {
    if (!isLoaded || isHidden) return;
    const timer = setTimeout(() => {
      // 欢迎消息
      const welcome = getPageSpecificWelcome();
      if (welcome) {
        showMessage(welcome, LIVE2D.MESSAGE_DURATION, LIVE2D.PRIORITY.PAGE_WELCOME);
      }
      // 博客页上下文消息（比欢迎消息稍晚显示）
      const contextMsg = getArticleContextMessage(finalTips.message.articleContext);
      if (contextMsg) {
        setTimeout(() => {
          showMessage(contextMsg, 6000, LIVE2D.PRIORITY.ARTICLE_CONTEXT);
        }, 1000);
      }
    }, LIVE2D.WELCOME_DELAY);
    return () => clearTimeout(timer);
  }, [isLoaded, isHidden, finalTips]);

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
        className="fixed right-0 bottom-16 z-[9999] flex items-center justify-center
          w-12 h-12 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white rounded-l-lg
          shadow-lg transition-all duration-300 cursor-pointer
          -mr-8 hover:-mr-2"
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
