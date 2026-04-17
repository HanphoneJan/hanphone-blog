'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Home,
  FileText,
  User,
  PenTool,
  Bookmark,
  Tag,
  MessageSquare,
  Notebook,
  Briefcase,
  UserCircle,
  Image as ImageIcon,
  Menu,
  X,
  Link,
  Sun,
  Moon,
  Heart,
  Zap
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from '@/contexts/ThemeProvider'
import { STORAGE_KEYS, ROUTES, ASSETS, HOME_CONFIG } from '@/lib/constants'
import { ADMIN_NAV_LABELS } from '@/lib/labels'

interface AdminHeaderProps {
  children?: React.ReactNode
}

interface MenuItem {
  id: number
  path: string
  authName: string
  icon: React.ReactNode
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ children }) => {
  const router = useRouter()
  const [isCollapse, setIsCollapse] = useState(false)
  const [activePath, setActivePath] = useState('')
  const [screenWidth, setScreenWidth] = useState<number>(HOME_CONFIG.INIT_SCREEN_WIDTH)
  const [showUserOptions, setShowUserOptions] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // 新增状态管理客户端hydration后的视图判断
  const [isClientHydrated, setIsClientHydrated] = useState(false)
  // 新增：控制主题切换放射动画的状态
  const [animateThemeToggle, setAnimateThemeToggle] = useState(false)

  // 用于计算下拉框位置的ref
  const avatarRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)
  // 创建一个ref用于portal容器
  const portalRef = useRef<HTMLDivElement | null>(null)

  const { userInfo, onLogout } = useUser()
  const { theme, toggleTheme } = useTheme()

  const menulist: MenuItem[] = [
    { id: 0, path: ROUTES.ADMIN_DEFAULT, authName: ADMIN_NAV_LABELS.HOME, icon: <Home size={20} /> },
    { id: 1, path: ROUTES.ADMIN_BLOG_INPUT, authName: ADMIN_NAV_LABELS.WRITE_BLOG, icon: <PenTool size={20} /> },
    { id: 2, path: ROUTES.ADMIN_BLOGS, authName: ADMIN_NAV_LABELS.BLOG_MANAGE, icon: <FileText size={20} /> },
    { id: 3, path: ROUTES.ADMIN_TYPES, authName: ADMIN_NAV_LABELS.TYPE_MANAGE, icon: <Bookmark size={20} /> },
    { id: 4, path: ROUTES.ADMIN_TAGS, authName: ADMIN_NAV_LABELS.TAG_MANAGE, icon: <Tag size={20} /> },
    { id: 5, path: ROUTES.ADMIN_ESSAYS, authName: ADMIN_NAV_LABELS.ESSAY_MANAGE, icon: <Notebook size={20} /> },
    { id: 6, path: ROUTES.ADMIN_COMMENTS, authName: ADMIN_NAV_LABELS.COMMENT_MANAGE, icon: <MessageSquare size={20} /> },
    { id: 7, path: ROUTES.ADMIN_PROJECTS, authName: ADMIN_NAV_LABELS.PROJECT_MANAGE, icon: <Briefcase size={20} /> },
    { id: 8, path: ROUTES.ADMIN_BLOG_FILES, authName: ADMIN_NAV_LABELS.FILE_MANAGE, icon: <ImageIcon size={20} /> },
    { id: 9, path: ROUTES.ADMIN_USERS, authName: ADMIN_NAV_LABELS.USER_MANAGE, icon: <User size={20} /> },
    { id: 10, path: ROUTES.ADMIN_LINKS, authName: ADMIN_NAV_LABELS.LINK_MANAGE, icon: <Link size={20} /> },
    { id: 11, path: ROUTES.ADMIN_PERSONAL, authName: ADMIN_NAV_LABELS.PERSONAL_CENTER, icon: <UserCircle size={20} /> }
  ]

  // 计算下拉框位置
  const getDropdownPosition = () => {
    if (typeof window === 'undefined' || !avatarRef.current) {
      return { top: 0, left: 0, width: 180 }
    }

    const rect = avatarRef.current.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    return {
      top: rect.bottom + scrollTop,
      left: rect.left + scrollLeft - 140, // 左移调整位置，使下拉框对齐头像右侧
      width: 180 // 固定宽度
    }
  }

  const calculateWidth = () => {
    return isCollapse ? '64px' : '150px'
  }

  const toggleMenu = () => {
    if (isMobileView) {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    } else {
      setIsCollapse(!isCollapse)
    }
  }

  const closeMobileMenu = () => {
    if (isMobileView) {
      setIsMobileMenuOpen(false)
    }
  }

  const goToHomePage = () => {
    setShowUserOptions(false)
    closeMobileMenu()
    router.push(ROUTES.HOME)
  }

  const screenAdapter = () => {
    const newWidth = window.innerWidth
    setScreenWidth(newWidth)
    // 在大屏幕上自动展开菜单
    if (newWidth > 768 && isCollapse) {
      setIsCollapse(false)
    }
    // 在小屏幕上自动关闭移动菜单
    if (newWidth > 768) {
      setIsMobileMenuOpen(false)
    }
  }

  const handleMenuClick = (path: string) => {
    console.log(path)
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PATH, path)
    setActivePath(path)
    router.push(path)
    closeMobileMenu()
  }

  // 点击页面其他区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowUserOptions(false)
      }
    }

    // 监听滚动事件，关闭下拉框
    const handleScroll = () => {
      setShowUserOptions(false)
    }

    window.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 客户端hydration完成后初始化
  useEffect(() => {
    // 标记客户端已完成hydration
    setIsClientHydrated(true)
    // 初始化屏幕宽度
    setScreenWidth(window.innerWidth)
    // 执行屏幕适配
    screenAdapter()
    // 监听窗口大小变化
    window.addEventListener('resize', screenAdapter)

    return () => {
      window.removeEventListener('resize', screenAdapter)
    }
  }, [])

  useEffect(() => {
    const savedPath = localStorage.getItem(STORAGE_KEYS.ACTIVE_PATH)
    if (savedPath) {
      setActivePath(savedPath)
    } else {
      setActivePath(ROUTES.ADMIN_DEFAULT)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PATH, ROUTES.ADMIN_DEFAULT)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActivePath(window.location.pathname)
    }
  }, [])

  // 仅在客户端hydration完成后才计算视图类型
  const isMobileView = isClientHydrated && screenWidth <= 768
  const isTabletView = isClientHydrated && screenWidth > 768 && screenWidth <= 1024

  // 获取下拉框位置
  const dropdownPosition = getDropdownPosition()

    // 带放射动画的主题切换按钮
    const ThemeToggleButton = () => {
      // 点击触发：先开启动画，再切换主题，动画结束后重置状态
      const handleToggleTheme = () => {
        setAnimateThemeToggle(true)
        toggleTheme()
        // 动画时长 500ms，结束后重置状态避免残留
        setTimeout(() => setAnimateThemeToggle(false), 500)
      }

      // 根据主题返回对应的图标和 aria-label
      const getThemeIcon = () => {
        switch (theme) {
          case 'light':
            return <Sun className="h-5 w-5 text-yellow-500" />
          case 'dark':
            return <Moon className="h-5 w-5 text-blue-300" />
          case 'macaron':
            return <Heart className="h-5 w-5 text-pink-400" />
          case 'cyber':
            return <Zap className="h-5 w-5 text-cyan-400" />
          default:
            return <Sun className="h-5 w-5 text-yellow-500" />
        }
      }

      const getThemeLabel = () => {
        switch (theme) {
          case 'light':
            return '当前：浅色模式'
          case 'dark':
            return '当前：深色模式'
          case 'macaron':
            return '当前：马卡龙主题'
          case 'cyber':
            return '当前：赛博朋克主题'
          default:
            return '切换主题'
        }
      }

      return (
        // 外层容器：相对定位，承载绝对定位的渐变遮罩
        <div className="relative">
          {/* 原有主题切换按钮：z-index 10 确保在遮罩上方，不被遮挡 */}
          <button
            onClick={handleToggleTheme}
            className="relative z-10 p-2 rounded-full bg-[rgb(var(--card))] hover:bg-[rgb(var(--hover))] transition-colors"
            aria-label={getThemeLabel()}
            title={getThemeLabel()}
          >
            {getThemeIcon()}
          </button>

          {/* 放射渐变遮罩：绝对定位，以按钮为中心扩散 */}
          <div
            className={`fixed inset-0 rounded-full z-100 transition-all duration-500 ease-out ${
              animateThemeToggle
                ? 'opacity-100 scale-200' // 动画激活：淡入+放大（从中心扩散）
                : 'opacity-0 scale-0' // 默认状态：隐藏+缩小到中心
            }`}
          />
        </div>
      )
    }

  return (
    <div className="flex w-full h-screen bg-[rgb(var(--card))] overflow-hidden">
      <aside
        className={`z-50 bg-[rgb(var(--bg))] backdrop-blur-sm text-[rgb(var(--text))] transition-all duration-300 shrink-0 border-r border-[rgb(var(--border))] ${
          isMobileView
            ? 'fixed top-16 left-0 h-[calc(100vh-4rem)] z-45 transform transition-transform duration-300'
            : ''
        }`}
        style={{
          width: isMobileView ? '240px' : calculateWidth(),
          minHeight: isMobileView ? 'auto' : '100vh',
          transform: isMobileView
            ? isMobileMenuOpen
              ? 'translateX(0)'
              : 'translateX(-100%)'
            : 'none'
        }}
      >
        <nav
          className={`${
            isMobileView
              ? 'w-full h-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-y-auto'
              : 'h-full'
          }`}
        >
          <ul className="py-4">
            {menulist.map(item => (
              <li
                key={item.id}
                className={`flex items-center py-3 px-4 cursor-pointer transition-all duration-300 rounded-lg mx-2 ${
                  activePath === item.path
                    ? 'bg-[rgb(var(--primary))] text-white'
                    : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))]'
                }`}
                onClick={() => handleMenuClick(item.path)}
              >
                <span className={`${isCollapse && !isMobileView ? 'mx-auto' : ''} ${
                  activePath === item.path
                    ? 'text-white'
                    : 'text-[rgb(var(--primary))]'
                }`}>
                  {item.icon}
                </span>
                {(!isCollapse || isMobileView) && (
                  <span className={`ml-3 ${isMobileView ? 'font-medium' : ''}`}>
                    {item.authName}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[rgb(var(--bg))] backdrop-blur-sm text-[rgb(var(--text))] h-16 flex items-center justify-between px-4 sm:px-6 z-20 border-b">
          <div
            className="cursor-pointer text-[rgb(var(--primary))] font-bold tracking-widest transition-colors hover:text-[rgb(var(--primary)/0.8)] p-2"
            onClick={toggleMenu}
            aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            {isMobileView ? (
              isMobileMenuOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )
            ) : (
              <span>|||</span>
            )}
          </div>

          <div
            className={`font-semibold text-[rgb(var(--primary))] truncate ${
              isMobileView ? 'text-base' : isTabletView ? 'text-lg' : 'text-xl'
            }`}
          >
            博客后台管理系统
          </div>

          <div className="flex items-center gap-3">
            {/* 主题切换按钮 */}
            <ThemeToggleButton />
            
            <div
              ref={avatarRef}
              className="relative flex items-center cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                setShowUserOptions(!showUserOptions)
              }}
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[rgb(var(--border))] transition-transform duration-300 hover:scale-110">
                <Image
                  src={userInfo?.avatar || ASSETS.DEFAULT_AVATAR}
                  alt="用户头像"
                  fill
                  sizes="36px" // 头像固定36px(9*4)大小
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        {/* 使用createPortal将下拉框挂载到body */}
        {showUserOptions &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={portalRef}
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 9999 // 全局最高层级
              }}
              className="bg-[rgb(var(--card))] rounded-lg shadow-sm py-1 border border-[rgb(var(--border))] overflow-visible"
            >
              <div className="px-4 py-2 text-sm text-[rgb(var(--primary))] font-medium">
                {userInfo?.nickname || '管理员'}
              </div>
              <div
                className="px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] cursor-pointer transition-colors"
                onClick={goToHomePage}
              >
                返回首页
              </div>
              <div
                className="px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] cursor-pointer transition-colors"
                onClick={() => {
                  onLogout()
                  setShowUserOptions(false)
                }}
              >
                退出登录
              </div>
            </div>,
            document.body // 挂载到body元素
          )}

        <main
          className={`flex-1 overflow-auto ${
            isMobileView ? 'p-0' : isTabletView ? 'p-1' : 'p-1'
          } bg-[rgb(var(--bg))] z-10`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminHeader