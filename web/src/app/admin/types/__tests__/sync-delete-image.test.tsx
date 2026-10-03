import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: vi.fn()
}))

vi.mock('@/lib/utils', () => ({
  default: apiClientMock
}))

vi.mock('@/contexts/UserContext', () => ({
  useUser: () => ({ userInfo: { id: 1000, type: 1 } })
}))

import CategoryManagement from '../page'

const CATEGORY = {
  id: 7,
  name: '后端',
  pic_url: 'https://hanphone.top/blog%2Ftype%2Fbackend.jpeg',
  color: 'blue',
  blogs: []
}

describe('分类管理页 - 删除时同步删除图片', () => {
  beforeEach(() => {
    window.localStorage.clear()
    apiClientMock.mockReset()
    apiClientMock.mockImplementation(({ url }: { url: string }) => {
      if (String(url).includes('/admin/getFullTypeList')) {
        return Promise.resolve({ data: { code: 200, data: [CATEGORY] } })
      }
      return Promise.resolve({ data: { code: 200, data: null } })
    })
  })

  it('删除分类应发送 DELETE 请求（历史 bug：曾误用 GET 导致 405）', async () => {
    const user = userEvent.setup()
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getAllByText('后端').length).toBeGreaterThan(0)
    })

    apiClientMock.mockClear()
    await user.click(screen.getByTitle('删除'))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '确认删除' }).length).toBeGreaterThan(0)
    })
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      const deleteCall = apiClientMock.mock.calls.find(
        call => call[0]?.method === 'DELETE' && String(call[0]?.url).includes('/admin/types/7')
      )
      expect(deleteCall).toBeTruthy()
      // 默认开启同步删除图片
      expect(String(deleteCall![0]?.url)).toContain('syncDeleteImage=true')
    })

    expect(
      apiClientMock.mock.calls.some(call => call[0]?.method === 'GET' && String(call[0]?.url).includes('/admin/types/7'))
    ).toBe(false)
  })

  it('关闭开关后删除分类应传 syncDeleteImage=false', async () => {
    const user = userEvent.setup()
    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '删除时同步删除图片' })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })

    await user.click(screen.getByRole('switch', { name: '删除时同步删除图片' }))

    // 开关状态持久化
    expect(window.localStorage.getItem('admin:syncDeleteImage')).toBe('false')

    await waitFor(() => {
      expect(screen.getAllByText('后端').length).toBeGreaterThan(0)
    })

    apiClientMock.mockClear()
    await user.click(screen.getByTitle('删除'))
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '确认删除' }).length).toBeGreaterThan(0)
    })
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      const deleteCall = apiClientMock.mock.calls.find(
        call => call[0]?.method === 'DELETE' && String(call[0]?.url).includes('/admin/types/7')
      )
      expect(deleteCall).toBeTruthy()
      expect(String(deleteCall![0]?.url)).toContain('syncDeleteImage=false')
    })
  })

  it('关闭开关的状态在重新挂载后仍然生效', async () => {
    window.localStorage.setItem('admin:syncDeleteImage', 'false')

    render(<CategoryManagement />)

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '删除时同步删除图片' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
    })
  })
})