"use client";

import { useState, useCallback } from "react";
import Compressor from "compressorjs";
import apiClient from "@/lib/utils";
import { ENDPOINTS } from "@/lib/api";

interface UseImageUploadOptions {
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /**
   * 上传目录，例如 `blog/blogs`、`blog/friendlink`。
   * 留空则由文件服务按文件类型自动归档。
   */
  namespace?: string;
  /** 覆盖上传地址；默认走 admin-file 的 `/upload`（需要登录 Token） */
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

/** 压缩后的 Blob 没有有意义的文件名，按 MIME 还原扩展名，保留原文件名主干 */
function namedImageFile(blob: Blob, original: File): File {
  const type = blob.type || original.type || 'image/jpeg'
  const extByType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
  }
  const ext = extByType[type.split(';')[0]] || '.jpg'
  const base = original.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}${ext}`, { type, lastModified: Date.now() })
}

/**
 * 图片上传 Hook：压缩 + 上传到 admin-file，返回图片 URL。
 *
 * 注意：这里用 `apiClient`（axios 实例），请求拦截器会自动带上 `Token`，
 * 所以只能用于已登录的后台页面；未登录场景（如前台申请友链）请走公开上传接口。
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    compress = true,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    namespace,
    uploadUrl = ENDPOINTS.FILE.UPLOAD,
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
          // Compressor 给的是无名字的 Blob，直接 append 到 FormData 会变成 "blob"，
          // 文件服务里全是 blob.jpg。这里用原文件名 + 实际 MIME 重新包一层。
          resolve(namedImageFile(result as Blob, file));
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
      if (namespace) {
        formData.append("namespace", namespace);
      }

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

      const imageUrl: string | undefined = response.data?.url;
      if (!imageUrl) {
        throw new Error("上传接口未返回图片地址");
      }
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
  }, [compressImage, namespace, uploadUrl]);

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
