/**
 * 判断键盘事件是否处于输入法（IME）组合输入阶段。
 *
 * 中文 / 日文 / 韩文用户按 Enter 是确认候选词，而不是提交表单。
 * Safari 在 compositionend 之前派发 Enter 时可能已把 isComposing 重置为 false，
 * 因此同时检查 keyCode === 229（VK_PROCESSKEY）。
 *
 * 参考 Modern Web Guidance 的 ime-safe-enter-submit。
 */
export function isImeComposing(event: KeyboardEvent | { nativeEvent: KeyboardEvent }): boolean {
  const native = 'nativeEvent' in event ? event.nativeEvent : event
  return native.isComposing || native.keyCode === 229
}
