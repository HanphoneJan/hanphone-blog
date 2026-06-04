"use client";

import { useState, useCallback } from "react";
import Compressor from "compressorjs";
import apiClient from "@/lib/utils";

interface UseImageUploadOptions {
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  uploadUrl?: string;
}

interface UseImageUploadReturn {
  uploading: boolean;
  uploadProgress: number;
  error: Error | null;
  uploadImage: (file: File, onSuccess?: (url: string) => void, onError?: (error: Error) => void) => Promise<string | null>;
  uploadImages: (files: File[], onSuccess?: (urls: string[]) => void, onError?: (error: Error) => void) => Promise<string[]>;
  compressImage: (file: File) => Promise<File>;
  resetError: () => void;
}

/**
 * 图片上传Hook
 * @param options 上传配置
 * @returns 上传状态和操作
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    compress = true,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    uploadUrl = "/api/upload",
  } = options;

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 压缩图片
   */
  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!compress) {
        resolve(file);
        return;
      }

      new Compressor(file, {
        quality,
        maxWidth,
        maxHeight,
        success(result) {
          resolve(result as File);
        },
        error(err) {
          reject(err);
        },
      });
    });
  }, [compress, maxWidth, maxHeight, quality]);

  /**
   * 上传单张图片
   */
  const uploadImage = useCallback(async (
    file: File,
    onSuccess?: (url: string) => void,
    onError?: (error: Error) => void
  ): Promise<string | null> => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // 压缩图片
      const compressedFile = await compressImage(file);

      // 创建FormData
      const formData = new FormData();
      formData.append("file", compressedFile);

      // 上传
      const response = await apiClient.post(uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      const imageUrl = response.data.url;
      onSuccess?.(imageUrl);
      return imageUrl;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setUploading(false);
    }
  }, [compressImage, uploadUrl]);

  /**
   * 批量上传图片
   */
  const uploadImages = useCallback(async (
    files: File[],
    onSuccess?: (urls: string[]) => void,
    onError?: (error: Error) => void
  ): Promise<string[]> => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const urls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        if (url) {
          urls.push(url);
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      onSuccess?.(urls);
      return urls;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return [];
    } finally {
      setUploading(false);
    }
  }, [uploadImage]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploading,
    uploadProgress,
    error,
    uploadImage,
    uploadImages,
    compressImage,
    resetError,
  };
}

export default useImageUpload;
