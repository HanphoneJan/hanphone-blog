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

import EssayManagementPage from '../page'

describe('随笔管理页 - 删除随笔文件', () => {
  beforeEach(() => {
    apiClientMock.mockReset()
    apiClientMock.mockResolvedValue({ data: { code: 200, data: [] } })
  })

  it('点击文件卡片的删除按钮应弹出"确认删除文件"弹窗', async () => {
    const user = userEvent.setup()
    render(<EssayManagementPage />)

    // 通过 URL 直填添加一个文件
    const urlInput = screen.getByPlaceholderText('直接填入文件URL，如 https://example.com/file.jpg')
    await user.type(urlInput, 'https://hanphone.top/blog/essay/note.md')
    await user.click(screen.getByRole('button', { name: '添加URL' }))

    // 文件卡片出现（文件名）
    await waitFor(() => {
      expect(screen.getByText('note.md')).toBeInTheDocument()
    })

    // 点击卡片上的删除按钮
    const deleteButtons = screen.getAllByRole('button', { name: '删除文件' })
    expect(deleteButtons.length).toBeGreaterThan(0)
    await user.click(deleteButtons[0])

    // 期望弹出确认弹窗
    await waitFor(() => {
      expect(screen.getByText('确认删除文件')).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        (_, el) => el?.tagName === 'P' && (el.textContent ?? '').includes('文件将从服务器立即删除，此操作不可撤销')
      )
    ).toBeInTheDocument()
  })

  it('确认删除后应向文件服务发起 DELETE 请求并移除文件', async () => {
    const user = userEvent.setup()
    render(<EssayManagementPage />)

    const urlInput = screen.getByPlaceholderText('直接填入文件URL，如 https://example.com/file.jpg')
    await user.type(urlInput, 'https://hanphone.top/blog/essay/note.md')
    await user.click(screen.getByRole('button', { name: '添加URL' }))

    await waitFor(() => {
      expect(screen.getByText('note.md')).toBeInTheDocument()
    })

    await user.click(screen.getAllByRole('button', { name: '删除文件' })[0])
    await waitFor(() => {
      expect(screen.getByText('确认删除文件')).toBeInTheDocument()
    })

    apiClientMock.mockClear()
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      const deleteCall = apiClientMock.mock.calls.find(
        call => call[0]?.method === 'DELETE' && String(call[0]?.url).includes('/delete')
      )
      expect(deleteCall).toBeTruthy()
      expect(deleteCall![0]).toMatchObject({
        url: 'https://hanphone.top/delete/',
        method: 'DELETE',
        data: { name: 'note.md', namespace: 'blog/essay', isDirectory: false }
      })
    })

    // 文件应从表单中移除
    await waitFor(() => {
      expect(screen.queryByText('note.md')).not.toBeInTheDocument()
    })
  })

  it('随笔列表的删除按钮应弹出确认弹窗并可完成删除随笔', async () => {
    apiClientMock.mockImplementation(({ url }: { url: string }) => {
      if (String(url).includes('/admin/essays')) {
        return Promise.resolve({
          data: {
            code: 200,
            data: [
              {
                id: 42,
                user_id: 1000,
                title: '测试随笔',
                content: '正文',
                createTime: '2026-01-01T00:00:00Z',
                essayFileUrls: [],
                recommend: false,
                published: true
              }
            ]
          }
        })
      }
      return Promise.resolve({ data: { code: 200, data: null } })
    })

    const user = userEvent.setup()
    render(<EssayManagementPage />)

    await user.click(screen.getByRole('button', { name: '随笔管理' }))

    await waitFor(() => {
      expect(screen.getAllByText('测试随笔').length).toBeGreaterThan(0)
    })

    apiClientMock.mockClear()
    await user.click(screen.getAllByRole('button', { name: '删除' })[0])

    await waitFor(() => {
      expect(
        screen.getAllByText('确定要删除这篇随笔吗？文件服务上的图片会一并删除，此操作不可撤销。').length
      ).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      const deleteCall = apiClientMock.mock.calls.find(
        call => call[0]?.method === 'DELETE' && String(call[0]?.url).includes('/admin/essay/42')
      )
      expect(deleteCall).toBeTruthy()
      // 默认开启同步删除图片
      expect(String(deleteCall![0]?.url)).toContain('syncDeleteImage=true')
    })
  })

  it('关闭「删除时同步删除图片」开关后应传 syncDeleteImage=false', async () => {
    apiClientMock.mockImplementation(({ url }: { url: string }) => {
      if (String(url).includes('/admin/essays')) {
        return Promise.resolve({
          data: {
            code: 200,
            data: [
              {
                id: 42,
                user_id: 1000,
                title: '测试随笔',
                content: '正文',
                createTime: '2026-01-01T00:00:00Z',
                essayFileUrls: [],
                recommend: false,
                published: true
              }
            ]
          }
        })
      }
      return Promise.resolve({ data: { code: 200, data: null } })
    })

    const user = userEvent.setup()
    render(<EssayManagementPage />)

    // 默认开关为开启
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '删除时同步删除图片' })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })

    await user.click(screen.getByRole('switch', { name: '删除时同步删除图片' }))

    await user.click(screen.getByRole('button', { name: '随笔管理' }))
    await waitFor(() => {
      expect(screen.getAllByText('测试随笔').length).toBeGreaterThan(0)
    })

    apiClientMock.mockClear()
    await user.click(screen.getAllByRole('button', { name: '删除' })[0])

    await waitFor(() => {
      expect(
        screen.getAllByText('确定要删除这篇随笔吗？当前开关为「仅删除记录」，图片会保留在文件服务器上。').length
      ).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      const deleteCall = apiClientMock.mock.calls.find(
        call => call[0]?.method === 'DELETE' && String(call[0]?.url).includes('/admin/essay/42')
      )
      expect(deleteCall).toBeTruthy()
      expect(String(deleteCall![0]?.url)).toContain('syncDeleteImage=false')
    })
  })
})
