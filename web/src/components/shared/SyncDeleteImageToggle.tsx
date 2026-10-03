"use client";

import React from "react";
import { ImageOff, Trash2 } from "lucide-react";

interface SyncDeleteImageToggleProps {
  /** 开关当前值，true = 删除记录时同步删除图片 */
  checked: boolean;
  /** 点击开关 */
  onChange: (checked: boolean) => void;
  className?: string;
}

const TITLE_ON = "已开启：删除记录时会同步删除文件服务上的图片（含缩略图）";
const TITLE_OFF = "已关闭：只删除数据库记录，文件服务上的图片会保留";

/**
 * 「删除时同步删除图片」开关
 *
 * 后台各管理页共用同一个偏好（localStorage），默认开启。
 * 关闭后删除随笔/项目/博客/分类只删数据库记录，图片留在文件服务器上。
 */
export function SyncDeleteImageToggle({
  checked,
  onChange,
  className = "",
}: SyncDeleteImageToggleProps) {
  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="删除时同步删除图片"
        title={checked ? TITLE_ON : TITLE_OFF}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))] ${
          checked ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border))]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>

      {/* 窄屏放不下文案，只留开关本体（title 仍有说明） */}
      <span className="hidden items-center gap-1.5 text-xs text-[rgb(var(--text-muted))] whitespace-nowrap md:inline-flex">
        {checked ? <Trash2 className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
        删除时同步删除图片
      </span>
    </div>
  );
}

export default SyncDeleteImageToggle;