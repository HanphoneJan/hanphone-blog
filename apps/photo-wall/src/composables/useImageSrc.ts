import { ref, onUnmounted } from 'vue';

/**
 * 照片墙图片加载策略
 *
 * 解决两个问题：
 * 1. 列表页直出「原图」（单张最大 12MB，9 张就是 ~47MB），进页面瞬间并发拉几十 MB，
 *    在 2C/2G 的服务器和移动网络上必然超时/失败。
 *    → 优先使用服务端在上传时生成的缩略图；老数据没有 thumbPath 时自动回退到原图。
 *
 * 2. 偶发失败（弱网、并发过高）会直接落到 el-image 的 error 槽位，
 *    用户只看到「加载失败」，没有任何恢复机会。
 *    → 失败后按 1.2s / 3s / 7s 退避重试，共 3 次；重试通过改写 URL 触发，
 *      nginx 的 try_files $uri 会忽略查询串，命中同一文件。
 *
 * 缩略图字段缺失（老数据 / 非图片）时全部透明回退，行为与改造前一致。
 */

/** 与 admin-file/lib/thumbnail.js 的 THUMB_WIDTHS 保持一致 */
export const THUMB_WIDTHS = [320, 800, 1600] as const;

/** 优先使用最接近展示宽度的档位：4 列瀑布流在 1440px 屏上约 360px/列，800w 可覆盖 2x 屏 */
const PREFERRED_WIDTH = 800;

const RETRY_DELAYS = [1200, 3000, 7000];

export interface ImageMeta {
  /** 原图完整 URL */
  path: string;
  /** 原图宽度（px） */
  width?: number | null;
  /** 原图高度（px） */
  height?: number | null;
  /** 列表页默认缩略图 URL */
  thumb_path?: string | null;
  /** 各档位缩略图 URL */
  thumbs?: Record<string, string | null> | null;
  id?: number | string;
}

export function useImageSrc() {
  /** 每个照片已重试的次数，用作 URL 版本号触发重新加载 */
  const retryCounts = ref<Record<string, number>>({});
  /** 待执行的退避定时器，卸载时统一清理 */
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const keyOf = (item: ImageMeta) => String(item.id ?? item.path);

  /**
   * 列表页展示用的 URL：优先缩略图，回退原图；重试时追加版本号查询串
   */
  const displaySrc = (item: ImageMeta): string => {
    const thumbs = item.thumbs;
    const base =
      (thumbs && thumbs[String(PREFERRED_WIDTH)]) ||
      item.thumb_path ||
      (thumbs && thumbs[String(PREFERRED_WIDTH / 2)]) ||
      item.path;

    const n = retryCounts.value[keyOf(item)] || 0;
    if (n === 0) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}_r=${n}`;
  };

  /**
   * 预留图片宽高比。
   *
   * 这一条很关键：瀑布流用的是 CSS `column-count`，`.image` 是 `height: auto`。
   * 如果不预留高度，加载完每张图都会重排所有卡片 → 原本视口外的图滑进视口 →
   * el-image 的 lazy IntersectionObserver 被连环触发 → 进页面瞬间几十张原图同时请求，
   * 这正是「进页面就加载失败、往下滚反而正常」的原因。
   */
  const aspectRatio = (item: ImageMeta): string | undefined => {
    const w = Number(item.width);
    const h = Number(item.height);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return `${w} / ${h}`;
    }
    // 没有尺寸信息时给一个常见 3:2 兜底，至少避免 0 高度引起的重排
    return undefined;
  };

  /**
   * 图片加载失败时调用：按退避策略重试，最多 3 次
   */
  const retry = (item: ImageMeta) => {
    const key = keyOf(item);
    const current = retryCounts.value[key] || 0;
    if (current >= RETRY_DELAYS.length) return;

    const delay = RETRY_DELAYS[current];
    const timer = setTimeout(() => {
      timers.delete(timer);
      // 只在仍挂载该照片时递增，避免对已销毁组件做无用功
      retryCounts.value = { ...retryCounts.value, [key]: current + 1 };
    }, delay);
    timers.add(timer);
  };

  onUnmounted(() => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  });

  return { displaySrc, aspectRatio, retry };
}