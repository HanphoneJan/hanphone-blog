'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { TIME, THEME_COLORS, STORAGE_KEYS } from '@/lib/constants'

type Theme = 'light' | 'dark' | 'macaron' | 'cyber'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isInitializing: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const themes: Theme[] = ['light', 'dark', 'macaron', 'cyber']

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [isInitializing, setIsInitializing] = useState<boolean>(true)

  const initializeTheme = useCallback(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      let finalTheme: Theme = 'light'
      if (savedTheme && themes.includes(savedTheme)) {
        finalTheme = savedTheme
      } else if (prefersDark) {
        finalTheme = 'dark'
      }

      // 应用初始主题
      applyTheme(finalTheme)
      setThemeState(finalTheme)
    } catch (error) {
      console.error('主题初始化失败:', error)
      applyTheme('light')
      setThemeState('light')
    } finally {
      setIsInitializing(false)
    }
  }, [])

  // 应用主题到 HTML 元素
  const applyTheme = (newTheme: Theme) => {
    // 清除所有主题类
    document.documentElement.classList.remove('dark', 'light', 'theme-macaron', 'theme-cyber')

    // 根据主题添加相应的类（macaron和cyber是独立主题，不依赖light/dark）
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.add('light')
    } else if (newTheme === 'macaron') {
      document.documentElement.classList.add('theme-macaron')
    } else if (newTheme === 'cyber') {
      document.documentElement.classList.add('theme-cyber')
    }
  }

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
    applyTheme(newTheme)

    // 主题切换动画
    document.documentElement.classList.add('theme-transition')
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, TIME.THEME_TRANSITION_DURATION)
  }, [])

  const toggleTheme = useCallback(() => {
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }, [theme])

  useEffect(() => {
    if (document.readyState === 'complete') {
      initializeTheme()
    } else {
      const handleLoad = () => {
        initializeTheme()
        window.removeEventListener('load', handleLoad)
      }
      window.addEventListener('load', handleLoad)
      return () => {
        window.removeEventListener('load', initializeTheme)
      }
    }
  }, [initializeTheme])

  // 更新主题颜色元数据
  useEffect(() => {
    if (isInitializing) return

    const themeColor = THEME_COLORS.BACKGROUND[theme]
    const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

    if (metaThemeColor) {
      metaThemeColor.content = themeColor
    } else {
      const newMeta = document.createElement('meta')
      newMeta.name = 'theme-color'
      newMeta.content = themeColor
      document.head.appendChild(newMeta)
    }

    const appleMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    )

    if (appleMeta) {
      appleMeta.content = theme === 'dark' || theme === 'cyber' ? 'black-translucent' : 'default'
    } else {
      const newAppleMeta = document.createElement('meta')
      newAppleMeta.name = 'apple-mobile-web-app-status-bar-style'
      newAppleMeta.content = theme === 'dark' || theme === 'cyber' ? 'black-translucent' : 'default'
      document.head.appendChild(newAppleMeta)
    }
  }, [theme, isInitializing])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isInitializing }}>
      {!isInitializing && children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
