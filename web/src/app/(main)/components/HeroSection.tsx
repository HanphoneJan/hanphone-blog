'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { ASSETS, STORAGE_KEYS } from '@/lib/constants'
import BgOverlay from './BgOverlay'

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const tickingRef = useRef(false)
  const [bgImage, setBgImage] = useState<string>(ASSETS.BACKGROUND_WEBP)

  // 加载用户设置的背景图片
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEYS.BACKGROUND_CUSTOM)
    if (!raw || raw === 'default') {
      setBgImage(ASSETS.BACKGROUND_WEBP)
    } else if (raw.startsWith('url:')) {
      setBgImage(raw.slice(4))
    } else if (raw.startsWith('data:image')) {
      setBgImage(raw)
    }

    // 监听背景图变化
    const handler = () => {
      const updated = localStorage.getItem(STORAGE_KEYS.BACKGROUND_CUSTOM)
      if (!updated || updated === 'default') {
        setBgImage(ASSETS.BACKGROUND_WEBP)
      } else if (updated.startsWith('url:')) {
        setBgImage(updated.slice(4))
      } else if (updated.startsWith('data:image')) {
        setBgImage(updated)
      }
    }
    window.addEventListener('blog-bg-change', handler)
    return () => window.removeEventListener('blog-bg-change', handler)
  }, [])

  // 逐字拆分标题动画
  useEffect(() => {
    const heroTitle = titleRef.current
    if (!heroTitle) return
    const titleText = heroTitle.textContent || ""
    heroTitle.innerHTML = ''
    let charIndex = 0
    for (let i = 0; i < titleText.length; i++) {
      const char = titleText[i]
      const span = document.createElement('span')
      if (char === ' ') {
        span.className = 'char char-space'
      } else {
        span.className = 'char'
        span.textContent = char
        span.style.animationDelay = (0.1 + charIndex * 0.06) + 's'
        charIndex++
      }
      heroTitle.appendChild(span)
    }
  }, [])

  // 视差滚动效果
  const updateParallax = useCallback(() => {
    const parallaxHero = heroRef.current
    if (!parallaxHero) return

    const rect = parallaxHero.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    if (rect.bottom > 0 && rect.top < viewportHeight) {
      const scrollProgress = -rect.top / viewportHeight

      // 隐藏滚动指示器
      if (scrollIndicatorRef.current) {
        if (scrollProgress > 0.15) {
          scrollIndicatorRef.current.classList.add('hidden')
        } else {
          scrollIndicatorRef.current.classList.remove('hidden')
        }
      }

      // 更新各层视差
      const layers = parallaxHero.querySelectorAll<HTMLElement>('.parallax-layer')
      layers.forEach(layer => {
        const speed = parseFloat(layer.dataset.speed || '0.3')
        const translateY = scrollProgress * viewportHeight * speed
        layer.style.transform = `translateY(${translateY}px)`
      })

      // 独立的光斑视差（带旋转）
      const orbs = parallaxHero.querySelectorAll<HTMLElement>('.parallax-orb')
      orbs.forEach((orb, index) => {
        const speed = parseFloat(orb.dataset.speed || '0.4')
        const rotate = scrollProgress * (index % 2 === 0 ? 15 : -10)
        const translateY = scrollProgress * viewportHeight * speed
        const translateX = scrollProgress * (index % 2 === 0 ? 20 : -15)
        orb.style.transform = `translateY(${translateY}px) translateX(${translateX}px) rotate(${rotate}deg)`
      })

      // 英雄区内容淡出
      const heroContent = parallaxHero.querySelector<HTMLElement>('.hero-content')
      if (heroContent) {
        const fadeProgress = Math.min(scrollProgress * 1.5, 1)
        heroContent.style.opacity = String(1 - fadeProgress)
        heroContent.style.transform = `translateY(${scrollProgress * 40}px)`
      }
    }

    tickingRef.current = false
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!tickingRef.current) {
        requestAnimationFrame(updateParallax)
        tickingRef.current = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    updateParallax()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [updateParallax])

  // 平滑滚动到内容区
  const scrollToContent = () => {
    const mainContent = document.getElementById('mainContent')
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="parallax-hero" id="parallaxHero" ref={heroRef}>
      {/* 背景图片层（用户设置，完全不透明） */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1
        }}
      />
      <BgOverlay opacity={0.1}/>
      {/* 视差层1：渐变网格背景 */}
      <div className="parallax-layer parallax-layer-1" data-speed="0.2" />

      {/* 视差层2：光斑 */}
      <div className="parallax-layer parallax-layer-2" data-speed="0.4">
        <div className="parallax-orb parallax-orb-1" data-speed="0.5" />
        <div className="parallax-orb parallax-orb-2" data-speed="0.3" />
        <div className="parallax-orb parallax-orb-3" data-speed="0.6" />
        <div className="parallax-orb parallax-orb-4" data-speed="0.35" />
      </div>

      {/* 视差层3：粒子网格 */}
      <div className="parallax-layer parallax-layer-3" data-speed="0.15" />

      {/* 视差层4：装饰线 */}
      <div className="parallax-layer parallax-layer-4" data-speed="0.25">
        <div className="parallax-line" style={{ top: '25%', left: 0, width: '100%' }} data-speed="0.2" />
        <div className="parallax-line" style={{ top: '75%', left: 0, width: '100%' }} data-speed="0.3" />
        <div className="parallax-line-v" style={{ left: '20%', top: 0, height: '100%' }} data-speed="0.15" />
        <div className="parallax-line-v" style={{ left: '80%', top: 0, height: '100%' }} data-speed="0.25" />
      </div>

      {/* 文字对比度遮罩层 */}
      <div className="hero-overlay" />

      {/* 英雄区内容 */}
      <div className="hero-content">
        <h1 className="hero-title" ref={titleRef} style={{ color: 'rgb(var(--text))' }}>
          {`Hanphone's Blog`}
        </h1>
        <p className="hero-subtitle" style={{ color: 'rgb(var(--text))' }}>
          全栈开发 · AI探索 · 持续学习
        </p>
        <div className="hero-tags">
          <span className="hero-tag hero-tag-1">项目</span>
          <span className="hero-tag hero-tag-2">照片</span>
          <span className="hero-tag hero-tag-3">文档</span>
          <span className="hero-tag hero-tag-4">留言</span>
          <span className="hero-tag hero-tag-5">随笔</span>
        </div>
      </div>

      {/* 滚动指示器 */}
      <div className="scroll-indicator" id="scrollIndicator" ref={scrollIndicatorRef} onClick={scrollToContent}>
        <span className="scroll-indicator-text">向下滚动</span>
        <div className="scroll-indicator-arrow" />
      </div>
    </section>
  )
}
