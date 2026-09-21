'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ENDPOINTS } from '@/lib/api';

// 页面访问埋点：fire-and-forget，不阻塞渲染；仅对公开站点路由生效。
// 用 usePathname 监听路由变化，客户端路由切换也会上报，实现"每页访问"口径。
const VisitTracker: React.FC = () => {
  const pathname = usePathname();

  useEffect(() => {
    const send = () => {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(ENDPOINTS.VISIT_TRACK, new Blob(['{}'], { type: 'application/json' }));
        } else {
          fetch(ENDPOINTS.VISIT_TRACK, { method: 'POST', keepalive: true }).catch(() => {});
        }
      } catch {
        // 埋点失败静默，不影响页面
      }
    };
    send();
  }, [pathname]);

  return null;
};

export default VisitTracker;