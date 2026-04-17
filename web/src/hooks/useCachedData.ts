"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseCachedDataOptions<T> {
  key: string;
  fetchData: () => Promise<T>;
  ttl?: number; // 缓存时间(毫秒)，默认5分钟
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseCachedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
  isStale: boolean;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * 数据缓存Hook
 * @param options 配置选项
 * @returns 缓存数据和操作
 */
export function useCachedData<T>(options: UseCachedDataOptions<T>): UseCachedDataReturn<T> {
  const { key, fetchData, ttl = 5 * 60 * 1000, enabled = true, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchInProgress = useRef<Promise<void> | null>(null);

  // 检查缓存是否过期
  const checkCache = useCallback((): T | null => {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      setIsStale(true);
      return entry.data; // 返回过期数据，同时标记为stale
    }

    return entry.data;
  }, [key, ttl]);

  // 获取数据
  const fetchWithCache = useCallback(async () => {
    // 检查内存缓存
    const cachedData = checkCache();
    if (cachedData && !isStale) {
      setData(cachedData);
      return;
    }

    // 避免重复请求
    if (fetchInProgress.current) {
      await fetchInProgress.current;
      return;
    }

    setLoading(true);
    setError(null);

    const fetchPromise = (async () => {
      try {
        const result = await fetchData();
        memoryCache.set(key, { data: result, timestamp: Date.now() });
        setData(result);
        setIsStale(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
        fetchInProgress.current = null;
      }
    })();

    fetchInProgress.current = fetchPromise;
    await fetchPromise;
  }, [fetchData, key, checkCache, isStale, onError]);

  // 强制重新获取
  const refetch = useCallback(async () => {
    memoryCache.delete(key);
    setIsStale(false);
    await fetchWithCache();
  }, [fetchWithCache, key]);

  // 使缓存失效
  const invalidate = useCallback(() => {
    memoryCache.delete(key);
    setData(null);
    setIsStale(false);
  }, [key]);

  // 初始加载
  useEffect(() => {
    if (enabled) {
      fetchWithCache();
    }
  }, [enabled, fetchWithCache]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale,
  };
}

export default useCachedData;
