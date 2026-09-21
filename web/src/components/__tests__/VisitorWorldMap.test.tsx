import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// mock echarts，避免 jsdom 环境加载真实库
vi.mock('echarts', () => ({
  init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() }),
  registerMap: vi.fn(),
}))

// mock apiClient，避免触发真实 axios 请求
vi.mock('@/lib/utils', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { code: 200, data: [] } }),
  },
}))

import { ThemeProvider } from '@/contexts/ThemeProvider'
import VisitorWorldMap from '../charts/VisitorWorldMap'

describe('VisitorWorldMap', () => {
  beforeEach(() => {
    // 清空 mock 调用记录
    vi.clearAllMocks()
  })

  it('在 ThemeProvider 下可正常渲染', () => {
    const { container } = render(
      <ThemeProvider>
        <VisitorWorldMap style={{ width: '100%', height: '300px' }} />
      </ThemeProvider>
    )
    expect(container.querySelector('.relative')).toBeTruthy()
  })
})