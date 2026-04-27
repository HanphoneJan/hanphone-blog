"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { showAlert } from "@/lib/Alert";

interface InlineEditState<T> {
  editingId: string | number | null;
  field: keyof T | null;
  value: string;
}

interface UseInlineEditOptions<T> {
  onSave: (id: string | number, field: keyof T, value: string) => Promise<void>;
  onValidate?: (value: string, field: keyof T) => boolean | string;
}

interface UseInlineEditReturn<T> {
  editingState: InlineEditState<T>;
  startEdit: (id: string | number, field: keyof T, initialValue: string) => void;
  updateValue: (value: string) => void;
  saveEdit: () => Promise<boolean>;
  cancelEdit: () => void;
  isEditing: (id: string | number, field: keyof T) => boolean;
}

/**
 * 内联编辑Hook
 * @param options 配置选项
 * @returns 内联编辑状态和操作
 */
export function useInlineEdit<T extends { id: string | number }>(
  options: UseInlineEditOptions<T>
): UseInlineEditReturn<T> {
  const { onSave, onValidate } = options;

  const [editingState, setEditingState] = useState<InlineEditState<T>>({
    editingId: null,
    field: null,
    value: "",
  });

  const previousValueRef = useRef<string>("");

  const startEdit = useCallback((id: string | number, field: keyof T, initialValue: string) => {
    previousValueRef.current = initialValue;
    setEditingState({
      editingId: id,
      field,
      value: initialValue,
    });
  }, []);

  const updateValue = useCallback((value: string) => {
    setEditingState((prev) => ({ ...prev, value }));
  }, []);

  const saveEdit = useCallback(async (): Promise<boolean> => {
    const { editingId, field, value } = editingState;

    if (!editingId || !field) return false;

    // 验证
    if (onValidate) {
      const validation = onValidate(value, field);
      if (validation !== true) {
        if (typeof validation === "string") {
          showAlert(validation, { type: 'warning' });
        }
        return false;
      }
    }

    // 如果值没有变化，直接取消编辑
    if (value === previousValueRef.current) {
      cancelEdit();
      return true;
    }

    try {
      await onSave(editingId, field, value);
      setEditingState({ editingId: null, field: null, value: "" });
      return true;
    } catch (error) {
      console.error("Failed to save:", error);
      return false;
    }
  }, [editingState, onSave, onValidate]);

  const cancelEdit = useCallback(() => {
    setEditingState({ editingId: null, field: null, value: "" });
  }, []);

  const isEditing = useCallback(
    (id: string | number, field: keyof T): boolean => {
      return editingState.editingId === id && editingState.field === field;
    },
    [editingState]
  );

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingState.editingId) {
        if (e.key === "Enter") {
          saveEdit();
        } else if (e.key === "Escape") {
          cancelEdit();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingState.editingId, saveEdit, cancelEdit]);

  return {
    editingState,
    startEdit,
    updateValue,
    saveEdit,
    cancelEdit,
    isEditing,
  };
}

export default useInlineEdit;
