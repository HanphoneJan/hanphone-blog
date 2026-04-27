'use client';

/**
 * Live2D Icons - 使用Lucide React图标
 */

import React from 'react';
import {
  MessageCircle,
  Rocket,
  User,
  Shirt,
  Camera,
  Info,
  X,
  Baby,
} from 'lucide-react';

// 创建SVG图标组件
export const CommentIcon = () => <MessageCircle size={20} />;
export const PaperPlaneIcon = () => <Rocket size={20} />;
export const StreetViewIcon = () => <User size={20} />;
export const ShirtIcon = () => <Shirt size={20} />;
export const CameraRetroIcon = () => <Camera size={20} />;
export const InfoCircleIcon = () => <Info size={20} />;
export const XMarkIcon = () => <X size={20} />;
export const ChildIcon = () => <Baby size={20} />;

// 工具名称到图标的映射
export const toolIcons: Record<string, React.ComponentType> = {
  hitokoto: CommentIcon,
  asteroids: PaperPlaneIcon,
  'switch-model': StreetViewIcon,
  'switch-texture': ShirtIcon,
  photo: CameraRetroIcon,
  info: InfoCircleIcon,
  quit: XMarkIcon,
};

// 获取图标组件
export function getToolIcon(name: string): React.ComponentType | null {
  return toolIcons[name] || null;
}
