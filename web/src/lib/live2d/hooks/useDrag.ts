'use client';

/**
 * Live2D 拖拽 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDragOptions {
  initialPosition?: Position;
  enabled?: boolean;
  bounds?: {
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
  };
}

export function useDrag(options: UseDragOptions = {}) {
  const {
    initialPosition = { x: 0, y: 0 },
    enabled = true,
    bounds = {},
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    if (e.button === 2) return; // 右键不处理
    
    // 只有点击canvas时才触发拖拽
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS') return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, [enabled]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    // 只有点击canvas时才触发拖拽
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS') return;
    
    setIsDragging(true);
    
    const touch = e.touches[0];
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  }, [enabled]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStartOffset.current.x;
      const newY = e.clientY - dragStartOffset.current.y;
      
      // 应用边界限制
      const minX = bounds.minX ?? 0;
      const minY = bounds.minY ?? 0;
      const maxX = bounds.maxX ?? window.innerWidth;
      const maxY = bounds.maxY ?? window.innerHeight;
      
      setPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStartOffset.current.x;
      const newY = touch.clientY - dragStartOffset.current.y;
      
      // 应用边界限制
      const minX = bounds.minX ?? 0;
      const minY = bounds.minY ?? 0;
      const maxX = bounds.maxX ?? window.innerWidth;
      const maxY = bounds.maxY ?? window.innerHeight;
      
      setPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, bounds]);

  return {
    position,
    setPosition,
    isDragging,
    elementRef,
    handleMouseDown,
    handleTouchStart,
  };
}
