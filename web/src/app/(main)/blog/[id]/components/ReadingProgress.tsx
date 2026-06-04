'use client'

import React from 'react'

interface CircularProgressProps {
  progress: number
  size?: number
  strokeWidth?: number
  children: React.ReactNode
}

function CircularProgress({ progress, size = 48, strokeWidth = 3, children }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-[rgb(var(--border)/0.3)]"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          className="stroke-[rgb(var(--primary))] transition-[stroke-dashoffset] duration-500 ease-in-out"
          style={{
            strokeDashoffset: circumference - (progress / 100) * circumference
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default CircularProgress
