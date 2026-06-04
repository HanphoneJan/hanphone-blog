interface BgOverlayProps {
  /** 透明度，默认 0.8 */
  opacity?: number;
  /** 背景颜色（RGB 值字符串，如 "0,0,0"），默认使用 CSS 变量 --bg */
  bgColor?: string;
}

export default function BgOverlay({ opacity = 0.5, bgColor }: BgOverlayProps) {
  const backgroundColor = bgColor
    ? `rgba(${bgColor}, ${opacity})`
    : `rgb(var(--bg) / ${opacity})`;

  return (
    <div
      className="fixed inset-0"
      style={{ backgroundColor }}
    />
  );
}