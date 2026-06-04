/**
 * Live2D 工具函数
 */

/**
 * 随机选择数组中的一个元素
 */
export function randomSelection<T>(obj: T[] | T): T {
  return Array.isArray(obj) 
    ? obj[Math.floor(Math.random() * obj.length)] 
    : obj;
}

/**
 * 随机选择另一个选项（排除当前索引）
 */
export function randomOtherOption(total: number, excludeIndex: number): number {
  const idx = Math.floor(Math.random() * (total - 1));
  return idx >= excludeIndex ? idx + 1 : idx;
}

/**
 * 国际化字符串替换
 */
export function i18n(template: string, ...args: string[]): string {
  return template.replace(/\$(\d+)/g, (_, idx) => {
    const i = parseInt(idx, 10) - 1;
    return args[i] ?? '';
  });
}

/**
 * 检查模型版本
 */
export function checkModelVersion(modelSetting: any): number {
  if (modelSetting?.Version === 3 || modelSetting?.FileReferences) {
    return 3;
  }
  return 2;
}

/**
 * 从localStorage安全读取
 */
export function getLocalStorageInt(key: string, defaultValue: number): number {
  if (typeof window === 'undefined') return defaultValue;
  const value = localStorage.getItem(key);
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 安全写入localStorage
 */
export function setLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
}

/**
 * 从localStorage安全读取
 */
export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('localStorage not available:', e);
    return null;
  }
}

/**
 * 从sessionStorage安全读取
 */
export function getSessionStorageInt(key: string, defaultValue: number): number {
  if (typeof window === 'undefined') return defaultValue;
  const value = sessionStorage.getItem(key);
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 安全写入sessionStorage
 */
export function setSessionStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    console.warn('sessionStorage not available:', e);
  }
}

/**
 * 从sessionStorage删除
 */
export function removeSessionStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    console.warn('sessionStorage not available:', e);
  }
}
