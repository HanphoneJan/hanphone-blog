import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createRequestId, useRequestId } from '../requestId'

describe('createRequestId', () => {
  it('生成非空字符串且两次调用不同', () => {
    const first = createRequestId()
    const second = createRequestId()
    expect(first).toBeTruthy()
    expect(first).not.toBe(second)
  })
})

describe('useRequestId', () => {
  it('成功前复用同一个 ID', () => {
    const { result } = renderHook(() => useRequestId())
    const first = result.current.getId()
    const second = result.current.getId()
    expect(second).toBe(first)
  })

  it('成功后重置，下一次得到新 ID', () => {
    const { result } = renderHook(() => useRequestId())
    const first = result.current.getId()
    act(() => {
      result.current.reset()
    })
    const afterReset = result.current.getId()
    expect(afterReset).not.toBe(first)
  })
})