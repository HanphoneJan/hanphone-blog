"use client";

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-12 h-12 border-4",
  xl: "w-16 h-16 border-4",
};

export function LoadingSpinner({ size = "md", className = "", text }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="mt-2 text-sm text-gray-500">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
