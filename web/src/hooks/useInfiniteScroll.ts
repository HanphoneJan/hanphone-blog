"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number) => Promise<T[]>;
  initialData?: T[];
  initialPage?: number;
  threshold?: number;
  hasMoreData?: (data: T[]) => boolean;
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  observerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * 无限滚动Hook
 * @param options 配置选项
 * @returns 无限滚动状态和操作
 */
export function useInfiniteScroll<T>(
  options: UseInfiniteScrollOptions<T>
): UseInfiniteScrollReturn<T> {
  const {
    fetchData,
    initialData = [],
    initialPage = 1,
    threshold = 100,
    hasMoreData = (data) => data.length > 0,
  } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);

  const observerRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || loadingMore || !hasMore) return;

    isFetchingRef.current = true;
    setLoadingMore(true);

    try {
      const newData = await fetchData(page);
      setData((prev) => [...prev, ...newData]);
      setHasMore(hasMoreData(newData));
      setPage((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [fetchData, page, loadingMore, hasMore, hasMoreData]);

  // 刷新数据
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    isFetchingRef.current = true;

    try {
      const newData = await fetchData(1);
      setData(newData);
      setHasMore(hasMoreData(newData));
      setPage(2);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchData, hasMoreData]);

  // 初始加载
  useEffect(() => {
    if (data.length === 0) {
      refresh();
    }
  }, []);

  // 设置Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMore, hasMore, loadingMore, threshold]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
    setData,
    observerRef,
  };
}

export default useInfiniteScroll;
