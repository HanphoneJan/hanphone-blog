'use client'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ColorPicker({ value, onChange, placeholder = "请输入颜色（如：#1890ff）" }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || '#1890ff'}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded cursor-pointer border border-[rgb(var(--border))] bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
        placeholder={placeholder}
      />
    </div>
  )
}
