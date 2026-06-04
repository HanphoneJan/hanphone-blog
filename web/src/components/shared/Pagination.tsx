"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  visiblePages: number[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  showFirstLast?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  visiblePages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
  showFirstLast = true,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* 首页按钮 */}
      {showFirstLast && (
        <button
          onClick={onFirstPage}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="首页"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      )}

      {/* 上一页按钮 */}
      <button
        onClick={onPrevPage}
        disabled={!hasPrevPage}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="上一页"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* 页码按钮 */}
      <div className="flex items-center gap-1">
        {visiblePages[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
            >
              1
            </button>
            {visiblePages[0] > 2 && (
              <span className="w-9 h-9 flex items-center justify-center text-gray-400">
                ...
              </span>
            )}
          </>
        )}

        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
              page === currentPage
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="w-9 h-9 flex items-center justify-center text-gray-400">
                ...
              </span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
            >
              {totalPages}
            </button>
          </>
        )}
      </div>

      {/* 下一页按钮 */}
      <button
        onClick={onNextPage}
        disabled={!hasNextPage}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="下一页"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* 末页按钮 */}
      {showFirstLast && (
        <button
          onClick={onLastPage}
          disabled={!hasNextPage}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="末页"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Pagination;
