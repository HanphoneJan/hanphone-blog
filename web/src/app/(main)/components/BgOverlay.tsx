interface BgOverlayProps {
  /** 透明度，默认 0.8 */
  opacity?: number;
}

export default function BgOverlay({ opacity = 0.5 }: BgOverlayProps) {
  return (
    <div
      className="fixed inset-0"
      style={{ backgroundColor: `rgb(var(--bg) / ${opacity})` }}
    />
  );
}
