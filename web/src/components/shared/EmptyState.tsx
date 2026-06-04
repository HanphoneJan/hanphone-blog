"use client";

import React from "react";
import { Inbox, Search, FileQuestion } from "lucide-react";

interface EmptyStateProps {
  type?: "empty" | "search" | "error" | "custom";
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const defaultIcons = {
  empty: Inbox,
  search: Search,
  error: FileQuestion,
  custom: Inbox,
};

const defaultTitles = {
  empty: "暂无数据",
  search: "未找到结果",
  error: "出错了",
  custom: "",
};

const defaultDescriptions = {
  empty: "这里还没有任何内容",
  search: "请尝试其他搜索条件",
  error: "请稍后重试",
  custom: "",
};

export function EmptyState({
  type = "empty",
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  const Icon = defaultIcons[type];
  const displayTitle = title ?? defaultTitles[type];
  const displayDescription = description ?? defaultDescriptions[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {icon || (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{displayTitle}</h3>
      <p className="text-sm text-gray-500 mb-4">{displayDescription}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
