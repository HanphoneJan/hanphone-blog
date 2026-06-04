'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { STORAGE_KEYS, API_CODE } from '@/lib/constants'
import { ENDPOINTS } from '@/lib/api'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUserInfo, setToken, setExpire, updateUserInfo } = useUser()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('正在完成 GitHub 登录...')
  const hasProcessed = useRef(false)

  // 登录模式：存储 token 和用户信息
  const doLogin = (token: string, userInfoParam: string) => {
    try {
      const userInfo = JSON.parse(decodeURIComponent(userInfoParam))

      setToken(token)
      setExpire(String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      setUserInfo({
        avatar: userInfo.avatar || '',
        nickname: userInfo.nickname,
        type: userInfo.type,
        email: userInfo.email,
        id: userInfo.id,
        username: userInfo.username,
        loginProvince: userInfo.loginProvince,
        loginCity: userInfo.loginCity,
        githubId: userInfo.githubId,
        googleId: userInfo.googleId,
        oauthProvider: userInfo.oauthProvider,
      })

      window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token))
      window.localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo))
      window.localStorage.setItem(STORAGE_KEYS.EXPIRE, JSON.stringify(Date.now() + 7 * 24 * 60 * 60 * 1000))

      setStatus('success')
      setMessage('登录成功，正在跳转...')

      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch {
      setStatus('error')
      setMessage('解析用户信息失败')
    }
  }

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true
    const token = searchParams.get('token')
    const userInfoParam = searchParams.get('userInfo')
    const provider = searchParams.get('provider') || 'github'
    const providerId = searchParams.get('providerId')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      if (error === 'access_denied') {
        setMessage('您取消了授权')
      } else {
        setMessage('登录失败，请重试')
      }
      return
    }

    // 检查是否已有登录态（绑定模式）
    const existingTokenRaw = window.localStorage.getItem(STORAGE_KEYS.TOKEN)
    const existingUserRaw = window.localStorage.getItem(STORAGE_KEYS.USER_INFO)
    const existingToken = existingTokenRaw ? JSON.parse(existingTokenRaw) : null
    const existingUser = existingUserRaw ? JSON.parse(existingUserRaw) : null
    const isBindMode = existingToken && existingUser?.id

    if (isBindMode && providerId) {
      // 绑定模式：用当前 token 调用 bind API
      const providerLabel = provider === 'google' ? 'Google' : 'GitHub'
      setMessage(`正在绑定 ${providerLabel} 账号...`)
      fetch(ENDPOINTS.USER.BIND_OAUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: existingToken
        },
        body: JSON.stringify({
          userId: existingUser.id,
          provider: provider,
          providerId: providerId
        })
      })
        .then(res => res.json())
        .then(result => {
          if (result.code === API_CODE.SUCCESS) {
            const merged = result.data?.merged
            const mergedFrom = result.data?.mergedFromNickname
            if (merged && mergedFrom) {
              setMessage(`绑定成功，已合并账号「${mergedFrom}」的数据`)
            } else {
              setMessage(`${providerLabel} 账号绑定成功`)
            }
            // 刷新 userInfo 中的 provider ID
            if (provider === 'google') {
              updateUserInfo({ googleId: providerId!, oauthProvider: 'google' })
            } else {
              updateUserInfo({ githubId: providerId!, oauthProvider: 'github' })
            }
            setStatus('success')
            setTimeout(() => router.push('/'), 1500)
          } else {
            // 绑定失败（如 token 过期），fallback：直接用新 token 登录
            doLogin(token!, userInfoParam!)
          }
        })
        .catch(() => {
          // 网络错误，fallback 到登录模式
          if (token && userInfoParam) {
            doLogin(token, userInfoParam)
          } else {
            setStatus('error')
            setMessage('绑定请求失败')
          }
        })
      return
    }

    // 登录模式
    if (token && userInfoParam) {
      doLogin(token, userInfoParam)
    } else if (token) {
      setToken(token)
      window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token))
      setStatus('success')
      setMessage('登录成功，正在跳转...')
      setTimeout(() => router.push('/'), 1500)
    } else {
      setStatus('error')
      setMessage('无效的登录回调')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- doLogin is stable, hasProcessed ensures single run
  }, [searchParams, router, setToken, setExpire, setUserInfo, updateUserInfo])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--background))]">
      <div className="text-center p-8 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] max-w-md">
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[rgb(var(--primary))] mx-auto mb-4" />
        )}
        {status === 'success' && (
          <div className="text-green-500 text-4xl mb-4">&#10003;</div>
        )}
        {status === 'error' && (
          <div className="text-red-500 text-4xl mb-4">&#10007;</div>
        )}
        <p className="text-[rgb(var(--text))] text-lg">{message}</p>
        {status === 'error' && (
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 rounded-md bg-[rgb(var(--primary))] text-white hover:opacity-90 transition-opacity"
          >
            返回首页
          </button>
        )}
      </div>
    </div>
  )
}
