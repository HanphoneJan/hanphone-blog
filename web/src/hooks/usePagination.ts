"use client";

import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  visiblePages: number[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

/**
 * 分页Hook
 * @param options 分页配置
 * @returns 分页状态和操作
 */
export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const { totalItems, itemsPerPage = 10, initialPage = 1 } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = useMemo(() =>
    Math.max(1, Math.ceil(totalItems / itemsPerPage)),
    [totalItems, itemsPerPage]
  );

  // 确保当前页在有效范围内
  const safeCurrentPage = useMemo(() =>
    Math.min(Math.max(1, currentPage), totalPages),
    [currentPage, totalPages]
  );

  const startIndex = useMemo(() =>
    (safeCurrentPage - 1) * itemsPerPage,
    [safeCurrentPage, itemsPerPage]
  );

  const endIndex = useMemo(() =>
    Math.min(startIndex + itemsPerPage, totalItems),
    [startIndex, itemsPerPage, totalItems]
  );

  // 计算可见页码（最多显示5个）
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }, [safeCurrentPage, totalPages]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  return {
    currentPage: safeCurrentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    visiblePages,
    hasNextPage: safeCurrentPage < totalPages,
    hasPrevPage: safeCurrentPage > 1,
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
  };
}

export default usePagination;
