"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "搜索...",
  className = "",
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
