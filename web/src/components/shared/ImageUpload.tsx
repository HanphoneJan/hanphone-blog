"use client";

import React, { useRef, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  placeholder?: string;
  accept?: string;
  compress?: boolean;
  previewHeight?: number;
  showProgress?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onError,
  className = "",
  placeholder = "点击或拖拽上传图片",
  accept = "image/*",
  compress = true,
  previewHeight = 160,
  showProgress = true,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadProgress, error, uploadImage, resetError } = useImageUpload({
    compress,
  });

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      resetError();
      const url = await uploadImage(file, onChange, onError);

      // 重置input以允许重复选择同一文件
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [uploadImage, onChange, onError, resetError]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
    },
    [onChange]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        resetError();
        await uploadImage(file, onChange, onError);
      }
    },
    [uploadImage, onChange, onError, resetError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (value) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden border border-gray-200 ${className}`}
        style={{ height: previewHeight }}
      >
        <img
          src={value}
          alt="Preview"
          className="w-full h-full object-cover"
        />
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`relative border-2 border-dashed border-gray-300 rounded-lg cursor-pointer
        hover:border-blue-500 hover:bg-blue-50/50 transition-all ${className}`}
      style={{ height: previewHeight }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            {showProgress && (
              <div className="w-full max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-gray-500 mt-1">
                  {uploadProgress}%
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 text-center">{placeholder}</p>
            {error && (
              <p className="text-xs text-red-500 mt-1 text-center">
                {error.message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ImageUpload;
