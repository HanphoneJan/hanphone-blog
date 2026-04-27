interface ModalOverlayProps {
  /** 遮罩透明度 (0-1), 默认 0.6 */
  opacity?: number
  /** 是否启用背景模糊, 默认 true */
  blur?: boolean
  /** z-index */
  zIndex?: number | string
  /** 点击遮罩回调 */
  onClick?: () => void
  /** 额外 className（如 md:hidden 控制响应式） */
  className?: string
}

export default function ModalOverlay({
  opacity = 0.6,
  blur = true,
  zIndex,
  onClick,
  className = '',
}: ModalOverlayProps) {
  return (
    <div
      className={`fixed inset-0 ${blur ? 'backdrop-blur-sm' : ''} ${className}`}
      style={{
        backgroundColor: `rgb(var(--overlay) / ${opacity})`,
        zIndex,
      }}
      onClick={onClick}
      aria-hidden="true"
    />
  )
}
