import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// 简单的 Button 组件测试示例
const Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) => {
  const baseStyles = 'rounded font-medium transition-colors'
  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }
  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-testid="button"
    >
      {children}
    </button>
  )
}

describe('Button 组件', () => {
  it('应该正确渲染按钮文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByTestId('button')).toHaveTextContent('点击我')
  })

  it('点击按钮时应该触发 onClick 事件', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击我</Button>)

    fireEvent.click(screen.getByTestId('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('禁用状态下不应该触发 onClick', () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} disabled>
        点击我
      </Button>
    )

    fireEvent.click(screen.getByTestId('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('应该根据 variant 应用正确的样式类', () => {
    const { rerender } = render(<Button variant="primary">主要按钮</Button>)
    expect(screen.getByTestId('button')).toHaveClass('bg-blue-500')

    rerender(<Button variant="secondary">次要按钮</Button>)
    expect(screen.getByTestId('button')).toHaveClass('bg-gray-200')

    rerender(<Button variant="danger">危险按钮</Button>)
    expect(screen.getByTestId('button')).toHaveClass('bg-red-500')
  })

  it('应该根据 size 应用正确的样式类', () => {
    const { rerender } = render(<Button size="sm">小按钮</Button>)
    expect(screen.getByTestId('button')).toHaveClass('px-3')

    rerender(<Button size="md">中按钮</Button>)
    expect(screen.getByTestId('button')).toHaveClass('px-4')

    rerender(<Button size="lg">大按钮</Button>)
    expect(screen.getByTestId('button')).toHaveClass('px-6')
  })

  it('禁用状态应该有正确的样式', () => {
    render(<Button disabled>禁用按钮</Button>)
    const button = screen.getByTestId('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
    expect(button).toHaveClass('cursor-not-allowed')
  })

  it('应该渲染子元素', () => {
    render(
      <Button>
        <span data-testid="icon">图标</span>
        <span>文本</span>
      </Button>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('文本')).toBeInTheDocument()
  })
})
