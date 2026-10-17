import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import Live2DWidget from '../Live2DWidget'

// 可变的 pathname，用于模拟客户端路由切换
const nav = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}))

// 用轻量 mock 替换真正的 Live2D（pixi 重且无关本测试）
vi.mock('@/lib/live2d', () => ({
  Live2DWidget: () => React.createElement('div', { 'data-testid': 'live2d' }),
}))

/** 注入 #parallaxHero，并让它返回指定的 bottom（jsdom 默认 getBoundingClientRect 全 0） */
function addHero(bottom: number): HTMLElement {
  const hero = document.createElement('section')
  hero.id = 'parallaxHero'
  setBottom(hero, bottom)
  document.body.appendChild(hero)
  return hero
}

function setBottom(el: HTMLElement, bottom: number) {
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 800,
      bottom,
      width: 800,
      height: bottom,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 桌宠外层包裹元素（opacity-0 表示隐藏） */
function wrapper(container: HTMLElement): HTMLElement {
  const el = container.querySelector('div.fixed.bottom-0.right-0')
  if (!el) throw new Error('Live2D wrapper not rendered')
  return el as HTMLElement
}

describe('Live2DWidget hero 隐藏逻辑', () => {
  beforeEach(() => {
    nav.pathname = '/'
    // 立即触发 idle，避免等待定时器
    ;(window as any).requestIdleCallback = (cb: (d: unknown) => void) => {
      cb({ didTimeout: false, timeRemaining: () => 50 })
      return 1
    }
    ;(window as any).cancelIdleCallback = () => {}
  })

  afterEach(() => {
    document.getElementById('parallaxHero')?.remove()
  })

  it('首页 hero 可见时隐藏桌宠', async () => {
    addHero(900)
    const { container } = render(<Live2DWidget />)
    await screen.findByTestId('live2d')

    await waitFor(() => expect(wrapper(container).className).toContain('opacity-0'))
    expect(wrapper(container).className).toContain('pointer-events-none')
  })

  it('非首页（无 hero）显示桌宠', async () => {
    nav.pathname = '/links'
    const { container } = render(<Live2DWidget />)
    await screen.findByTestId('live2d')

    await waitFor(() => expect(wrapper(container).className).toContain('opacity-100'))
  })

  it('返回首页、hero 延迟挂载（loading 态之后）也会隐藏桌宠', async () => {
    // 模拟：从其它页导航回首页，先无 hero，随后才挂载
    const { container } = render(<Live2DWidget />)
    await screen.findByTestId('live2d')

    // hero 尚未出现 → 先显示
    await waitFor(() => expect(wrapper(container).className).toContain('opacity-100'))

    // hero 延迟挂载 → 应被 MutationObserver 侦测并隐藏
    await act(async () => {
      addHero(900)
    })

    await waitFor(() => expect(wrapper(container).className).toContain('opacity-0'))
  })

  it('从首页切到其它页后，hero 消失则重新显示桌宠', async () => {
    const hero = addHero(900)
    const { container, rerender } = render(<Live2DWidget />)
    await screen.findByTestId('live2d')
    await waitFor(() => expect(wrapper(container).className).toContain('opacity-0'))

    await act(async () => {
      hero.remove()
      nav.pathname = '/links'
      rerender(<Live2DWidget />)
    })

    await waitFor(() => expect(wrapper(container).className).toContain('opacity-100'))
  })

  it('滚动过 hero 后显示桌宠', async () => {
    const hero = addHero(900)
    const { container } = render(<Live2DWidget />)
    await screen.findByTestId('live2d')
    await waitFor(() => expect(wrapper(container).className).toContain('opacity-0'))

    await act(async () => {
      setBottom(hero, 50)
      window.dispatchEvent(new Event('scroll'))
    })

    await waitFor(() => expect(wrapper(container).className).toContain('opacity-100'))
  })
})
