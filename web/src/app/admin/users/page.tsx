'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useUser } from '@/contexts/UserContext'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import {
  Search,
  Trash2,
  Loader2,
  User,
  Mail,
  MapPin,
  Calendar,
  Clock,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {  VALIDATION, ASSETS , API_CODE } from '@/lib/constants'
import { ADMIN_USER_LABELS } from '@/lib/labels'
import md5 from 'md5'

// 动画变体定义
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3
    }
  }
}

// 定义用户数据类型
interface User {
  id: number
  avatar: string
  nickname: string
  username: string
  email: string
  createTime: string
  lastLoginTime: string | null
  loginProvince: string
  loginCity: string
  type: '0' | '1' // 0: 普通用户, 1: 管理员
}

// 编辑用户表单数据类型
interface EditFormData {
  nickname: string
  email: string
  avatar: string
  password: string
}

// 时间格式化函数
const dateFormat = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

// 相对时间格式化
const timeAgo = (dateString: string): string => {
  if (!dateString) return '从未登录'

  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  let interval = Math.floor(seconds / 31536000)
  if (interval >= 1) {
    return `${interval}年前`
  }

  interval = Math.floor(seconds / 2592000)
  if (interval >= 1) {
    return `${interval}个月前`
  }

  interval = Math.floor(seconds / 86400)
  if (interval >= 1) {
    return `${interval}天前`
  }

  interval = Math.floor(seconds / 3600)
  if (interval >= 1) {
    return `${interval}小时前`
  }

  interval = Math.floor(seconds / 60)
  if (interval >= 1) {
    return `${interval}分钟前`
  }

  return '刚刚'
}

// API调用函数
const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
  try {
    const response = await apiClient({
      url,
      method,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined
    })

    return response.data
  } catch (error) {
    console.log(`Error fetching ${url}:`, error)
    return { code: 500, data: null }
  }
}

export default function UserManagementPage() {
  const [userList, setUserList] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmEmailChange, setConfirmEmailChange] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set())
  const { userInfo } = useUser()

  // 编辑用户相关状态
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData>({
    nickname: '',
    email: '',
    avatar: '',
    password: ''
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 切换用户详情展开状态
  const toggleUserExpanded = (userId: number) => {
    const newExpandedUsers = new Set(expandedUsers)
    if (newExpandedUsers.has(userId)) {
      newExpandedUsers.delete(userId)
    } else {
      newExpandedUsers.add(userId)
    }
    setExpandedUsers(newExpandedUsers)
  }

  // 获取用户列表
  const getUserList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.USERS, 'GET', { search })

      if (res.code === API_CODE.SUCCESS) {
        let filteredData: User[] = res.data || []

        // 搜索过滤
        if (search) {
          const reg = new RegExp(search, 'i')
          filteredData = filteredData.filter(
            (item: User) => reg.test(item.nickname) || reg.test(item.username)
          )
        }

        setUserList(filteredData)
      } else {
        showAlert(ADMIN_USER_LABELS.FETCH_FAIL)
      }
    } catch (error) {
      console.error('获取用户列表出错:', error)
      showAlert(ADMIN_USER_LABELS.FETCH_FAIL)
    } finally {
      setLoading(false)
    }
  }, [search])

  // 页面加载时获取数据
  useEffect(() => {
    getUserList()
  }, [getUserList])

  // 处理搜索框回车
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      getUserList()
    }
  }

  // 修改用户权限状态
  const userStateChanged = async (row: User) => {
    try {
      setLoading(true)
      const res = await fetchData(ENDPOINTS.ADMIN.USER, 'POST', { user: row })

      if (res.code !== API_CODE.SUCCESS) {
        // 失败时恢复状态并重新加载列表
        setUserList(prev =>
          prev.map(u => (u.id === row.id ? { ...u, type: u.type === '1' ? '0' : '1' } : u))
        )
        showAlert(ADMIN_USER_LABELS.PERMISSION_CHANGE_FAIL)
        return
      }
      getUserList()
    } catch (error) {
      console.error('修改用户权限出错:', error)
      showAlert(ADMIN_USER_LABELS.PERMISSION_CHANGE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  // 删除用户
  const deleteUser = async (id: number) => {
    try {
      setLoading(true)
      const res = await fetchData(`${ENDPOINTS.ADMIN.USERS}/${id}/delete`, 'GET')

      if (res.code !== API_CODE.SUCCESS) {
        return showAlert(ADMIN_USER_LABELS.DELETE_FAIL)
      }
      showAlert(ADMIN_USER_LABELS.DELETE_SUCCESS)
      setConfirmDelete(null)
      getUserList()
    } catch (error) {
      console.error('删除用户出错:', error)
      showAlert(ADMIN_USER_LABELS.DELETE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  // 打开编辑用户模态框
  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      nickname: user.nickname,
      email: user.email,
      avatar: user.avatar,
      password: ''
    })
    setShowPassword(false)
    setEditModalVisible(true)
  }

  // 关闭编辑用户模态框
  const closeEditModal = () => {
    setEditModalVisible(false)
    setEditingUser(null)
    setEditFormData({
      nickname: '',
      email: '',
      avatar: '',
      password: ''
    })
    setShowPassword(false)
  }

  // 上传头像
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]
    setUploadingAvatar(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('avatar', file)

      const response = await fetch(ENDPOINTS.FILE.AVATAR_UPLOAD, {
        method: 'POST',
        body: formDataUpload
      })

      const data = await response.json()
      if (data?.url) {
        setEditFormData(prev => ({ ...prev, avatar: data.url }))
        showAlert(ADMIN_USER_LABELS.AVATAR_UPLOAD_SUCCESS)
      } else {
        showAlert(ADMIN_USER_LABELS.AVATAR_UPLOAD_FAIL)
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      showAlert(ADMIN_USER_LABELS.AVATAR_UPLOAD_FAIL)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // 更新用户信息
  const updateUser = async () => {
    if (!editingUser) return

    // 表单验证
    if (!editFormData.nickname.trim()) {
      showAlert(ADMIN_USER_LABELS.NICKNAME_REQUIRED)
      return
    }
    if (editFormData.nickname.length < VALIDATION.NICKNAME_MIN || editFormData.nickname.length > VALIDATION.NICKNAME_MAX_PROFILE) {
      showAlert(`昵称长度在${VALIDATION.NICKNAME_MIN}-${VALIDATION.NICKNAME_MAX_PROFILE}个字符之间`)
      return
    }
    if (!editFormData.email.trim()) {
      showAlert(ADMIN_USER_LABELS.EMAIL_REQUIRED)
      return
    }
    if (!VALIDATION.EMAIL_REGEX.test(editFormData.email)) {
      showAlert(ADMIN_USER_LABELS.EMAIL_INVALID)
      return
    }

    // 密码验证（如果填写了密码）
    if (editFormData.password && (editFormData.password.length < VALIDATION.PASSWORD_MIN || editFormData.password.length > VALIDATION.PASSWORD_MAX_OPTIONAL)) {
      showAlert(`密码长度在${VALIDATION.PASSWORD_MIN}-${VALIDATION.PASSWORD_MAX_OPTIONAL}个字符之间`)
      return
    }

    try {
      setLoading(true)

      // 检查邮箱是否被修改
      const emailChanged = editFormData.email !== editingUser.email
      if (emailChanged) {
        setConfirmEmailChange(true)
        return
      }

      await doUpdateUser()
    } catch (error) {
      console.error('更新用户信息出错:', error)
      showAlert(ADMIN_USER_LABELS.UPDATE_FAIL)
    } finally {
      setLoading(false)
    }
  }

  // 确认邮箱修改后执行提交
  const handleConfirmEmailChange = async () => {
    setConfirmEmailChange(false)
    await doUpdateUser()
  }

  const handleCancelEmailChange = () => {
    setConfirmEmailChange(false)
    setLoading(false)
  }

  // 实际执行更新
  const doUpdateUser = async () => {
    if (!editingUser) return
    try {
      const res = await fetchData(ENDPOINTS.ADMIN.USER, 'POST', {
        user: {
          id: editingUser.id,
          username: editingUser.username,
          nickname: editFormData.nickname,
          email: editFormData.email,
          avatar: editFormData.avatar,
          type: editingUser.type,
          createTime: editingUser.createTime,
          lastLoginTime: editingUser.lastLoginTime,
          loginProvince: editingUser.loginProvince,
          loginCity: editingUser.loginCity,
          ...(editFormData.password && { password: md5(editFormData.password) })
        }
      })

      if (res.code !== API_CODE.SUCCESS) {
        showAlert(ADMIN_USER_LABELS.UPDATE_FAIL)
        return
      }

      showAlert(ADMIN_USER_LABELS.UPDATE_SUCCESS)
      closeEditModal()
      getUserList()
    } catch (error) {
      console.error('更新用户信息出错:', error)
      showAlert(ADMIN_USER_LABELS.UPDATE_FAIL)
    }
  }

  // 渲染开关组件
  const renderSwitch = (checked: boolean, onChange: () => void, disabled: boolean) => (
    <div
      className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${
        disabled ? 'bg-[rgb(var(--muted))]' : checked ? 'bg-[rgb(var(--primary))]' : 'bg-slate-400'
      }`}
      onClick={disabled ? () => {} : onChange}
    >
      <div
        className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {checked && !disabled && (
          <Check className="absolute inset-0 m-auto w-3 h-3 text-[rgb(var(--primary))]" />
        )}
        {!checked && !disabled && <X className="absolute inset-0 m-auto w-3 h-3 text-slate-600" />}
      </div>
    </div>
  )

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative overflow-hidden"
    >
      {/* 背景装饰 - 已移除 */}

      <main className="flex-1 w-full max-w-7xl mx-auto lg:px-2 lg:py-2 relative z-10">
        {/* 用户管理卡片 */}
        <motion.div
          variants={fadeInUpVariants}
          className="bg-[rgb(var(--card))]/80 backdrop-blur-sm lg:rounded-xl shadow-sm min-h-[100vh] border-[rgb(var(--border))] overflow-hidden"
        >
          {/* 搜索区域 - 合并搜索框和按钮 */}
          <div className="p-4 sm:p-6 border-b border-[rgb(var(--border))]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[rgb(var(--muted))]" />
                <input
                  type="text"
                  placeholder="搜索用户名或昵称"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-24 py-2 rounded-lg border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
                />
                <motion.button
                  onClick={() => getUserList()}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 rounded-md transition duration-300 flex items-center justify-center gap-1 ${
                    loading
                      ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))]'
                      : 'bg-[rgb(var(--hover))] hover:bg-[rgb(var(--muted))] text-[rgb(var(--text))]'
                  }`}
                >
                  <span className="text-sm">搜索</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* 用户列表 */}
          <div className="min-h-[90vh]">
            {loading ? (
              // 加载状态骨架屏
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 h-[400px] flex flex-col justify-center">
                {[1, 2, 3, 4, 5].map(item => (
                  <div key={item} className="flex animate-pulse gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--muted))]/50 shrink-0"></div>
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-[rgb(var(--muted))]/50 rounded w-24"></div>
                        <div className="h-3 bg-[rgb(var(--muted))]/50 rounded w-20"></div>
                      </div>
                      <div className="h-4 bg-[rgb(var(--muted))]/50 rounded w-32 self-center"></div>
                      <div className="h-4 bg-[rgb(var(--muted))]/50 rounded w-40 self-center hidden sm:block"></div>
                      <div className="h-6 bg-[rgb(var(--muted))]/50 rounded w-16 self-center"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userList.length > 0 ? (
              <div>
                {/* 桌面端列表表头 */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-4 sm:px-6 py-4 text-sm font-medium text-[rgb(var(--muted))] border-b border-[rgb(var(--border))]">
                  <div className="col-span-1">序号</div>
                  <div className="col-span-2">用户信息</div>
                  <div className="col-span-2">账号信息</div>
                  <div className="col-span-2">注册时间</div>
                  <div className="col-span-1">最近登录</div>
                  <div className="col-span-2">地址</div>
                  <div className="col-span-1">管理员</div>
                  <div className="col-span-1">操作</div>
                </div>

                {/* 列表内容 */}
                <ul className="lg:divide-y lg:divide-[rgb(var(--border))]/30">
                  {userList.map((user, index) => (
                    <motion.li
                      key={user.id}
                      variants={listItemVariants}
                      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-[rgb(var(--hover))]/60 transition-colors ${
                        index > 0 ? 'lg:border-t-0 border-t border-[rgb(var(--border))]/30' : ''
                      }`}
                    >
                      {/* 移动端和中等屏幕布局 */}
                      <div className="lg:hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-[rgb(var(--border))] shrink-0">
                              <Image
                                src={user.avatar || ASSETS.DEFAULT_AVATAR}
                                alt={`${user.nickname}的头像`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[rgb(var(--primary))] text-sm truncate">
                                {user.nickname}
                              </div>
                              <div className="text-xs text-[rgb(var(--muted))] truncate">
                                @{user.username}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              {renderSwitch(
                                user.type === '1',
                                () =>
                                  userStateChanged({
                                    ...user,
                                    type: user.type === '1' ? '0' : '1'
                                  }),
                                Number(userInfo?.id) === user.id || user.id === 1
                              )}
                            </div>

                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded-full text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => setConfirmDelete(user.id)}
                              disabled={Number(userInfo?.id) === user.id || user.id === 1}
                              className={`p-1.5 rounded-full transition-colors ${
                                Number(userInfo?.id) === user.id || user.id === 1
                                  ? 'text-[rgb(var(--muted))] cursor-not-allowed'
                                  : 'text-red-500 hover:bg-red-500/10 hover:text-red-600'
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => toggleUserExpanded(user.id)}
                              className="p-1.5 rounded-full text-[rgb(var(--muted))] hover:bg-[rgb(var(--hover))] hover:text-[rgb(var(--text))] transition-colors"
                            >
                              {expandedUsers.has(user.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 移动端用户详情展开区域 */}
                        {expandedUsers.has(user.id) && (
                          <div className="mt-3 pt-3 border-t border-[rgb(var(--border))] space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                              <span className="text-[rgb(var(--text-muted))] min-w-[60px]">邮箱：</span>
                              <span className="text-[rgb(var(--text))] truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                              <span className="text-[rgb(var(--text-muted))] min-w-[60px]">注册：</span>
                              <span className="text-[rgb(var(--text))] truncate">
                                {dateFormat(user.createTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                              <span className="text-[rgb(var(--text-muted))] min-w-[60px]">登录：</span>
                              <span className="text-[rgb(var(--text))] truncate">
                                {user.lastLoginTime ? timeAgo(user.lastLoginTime) : '从未登录'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                              <span className="text-[rgb(var(--text-muted))] min-w-[60px]">地址：</span>
                              <span className="text-[rgb(var(--text))] truncate">
                                {user.loginProvince} {user.loginCity}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 桌面端布局 */}
                      <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                        {/* 序号 */}
                        <div className="col-span-1 text-[rgb(var(--muted))] text-sm">{index + 1}</div>

                        {/* 用户信息 */}
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-[rgb(var(--border))] shrink-0">
                            <Image
                              src={user.avatar || ASSETS.DEFAULT_AVATAR}
                              alt={`${user.nickname}的头像`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[rgb(var(--primary))] truncate">
                              {user.nickname}
                            </div>
                            <div className="text-xs text-[rgb(var(--muted))] truncate">@{user.username}</div>
                          </div>
                        </div>

                        {/* 账号信息 */}
                        <div className="col-span-2 flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                          <span className="text-[rgb(var(--text))] truncate">{user.email}</span>
                        </div>

                        {/* 注册时间 */}
                        <div className="col-span-2 flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                          <span className="text-[rgb(var(--text))] truncate">
                            {dateFormat(user.createTime)}
                          </span>
                        </div>

                        {/* 最近登录 */}
                        <div className="col-span-1 flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                          <span className="text-[rgb(var(--text))] truncate">
                            {user.lastLoginTime ? timeAgo(user.lastLoginTime) : '从未登录'}
                          </span>
                        </div>

                        {/* 地址 */}
                        <div className="col-span-2 flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-[rgb(var(--muted))] shrink-0" />
                          <span className="text-[rgb(var(--text))] truncate">
                            {user.loginProvince} {user.loginCity}
                          </span>
                        </div>

                        {/* 管理员开关 */}
                        <div className="col-span-1 flex items-center">
                          {renderSwitch(
                            user.type === '1',
                            () =>
                              userStateChanged({
                                ...user,
                                type: user.type === '1' ? '0' : '1'
                              }),
                            Number(userInfo?.id) === user.id || user.id === 1
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="col-span-1 flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-full text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(user.id)}
                            disabled={Number(userInfo?.id) === user.id || user.id === 1}
                            className={`p-1.5 rounded-full transition-colors ${
                              Number(userInfo?.id) === user.id || user.id === 1
                                ? 'text-[rgb(var(--muted))] cursor-not-allowed'
                                : 'text-red-500 hover:bg-red-500/10 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ) : (
              // 空状态
              <div className="flex flex-col items-center justify-center h-[400px] text-[rgb(var(--muted))]">
                <User className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">暂无用户数据</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* 邮箱修改确认弹窗 */}
      <ConfirmDialog
        isOpen={confirmEmailChange}
        title="确认修改邮箱"
        message="您正在修改该用户的邮箱，确定要继续吗？"
        confirmText="确认修改"
        cancelText="取消"
        variant="warning"
        onConfirm={handleConfirmEmailChange}
        onCancel={handleCancelEmailChange}
      />

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay))] backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))]/90 rounded-xl border-[rgb(var(--border))] w-full max-w-md p-5 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))] mb-2">确认删除</h3>
              <p className="text-[rgb(var(--text-muted))] mb-5 sm:mb-6 text-sm sm:text-base">确定要删除该用户吗？此操作不可撤销。</p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 sm:px-4 py-2 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => deleteUser(confirmDelete)}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-2 text-sm"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  确认删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 编辑用户信息弹窗 */}
      <AnimatePresence>
        {editModalVisible && editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgb(var(--overlay))] backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[rgb(var(--card))]/90 rounded-xl border-[rgb(var(--border))] w-full max-w-md p-5 sm:p-6"
            >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--primary))]">编辑用户信息</h3>
              <button
                onClick={closeEditModal}
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 用户名（只读） */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  className="w-full px-3 py-2 border rounded-md bg-[rgb(var(--muted))]/30 text-[rgb(var(--text-muted))] cursor-not-allowed"
                />
              </div>

              {/* 昵称 */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  昵称
                </label>
                <input
                  type="text"
                  value={editFormData.nickname}
                  onChange={e => setEditFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="请输入昵称"
                  className="w-full px-3 py-2 border rounded-md bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-colors"
                />
              </div>

              {/* 邮箱 */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={e => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入邮箱"
                  className="w-full px-3 py-2 border rounded-md bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-colors"
                />
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  修改邮箱后，用户下次登录需要使用新邮箱。建议谨慎操作。
                </p>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  新密码（可选）
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editFormData.password}
                    onChange={e => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="不修改请留空（6-10个字符）"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 border rounded-md bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  只有在需要重置用户密码时填写，留空则不修改密码
                </p>
              </div>

              {/* 头像 */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                  头像
                </label>
                <div className="flex items-center gap-4">
                  {/* 当前头像预览 */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[rgb(var(--border))] shrink-0">
                    <Image
                      src={editFormData.avatar || ASSETS.DEFAULT_AVATAR}
                      alt="用户头像"
                      fill
                      className="object-cover"
                    />
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* 上传按钮 */}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                      id="avatar-upload-edit"
                    />
                    <label
                      htmlFor="avatar-upload-edit"
                      className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        uploadingAvatar
                          ? 'bg-[rgb(var(--muted))] text-[rgb(var(--text-muted))] cursor-not-allowed'
                          : 'bg-[rgb(var(--hover))] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))]'
                      }`}
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>上传中...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>更换头像</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={closeEditModal}
                className="px-4 py-2 rounded-md border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover))] transition-colors text-sm"
              >
                取消
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={updateUser}
                disabled={loading || uploadingAvatar}
                className="px-4 py-2 rounded-md bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))] transition-colors flex items-center gap-2 text-sm"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                保存
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  )
}