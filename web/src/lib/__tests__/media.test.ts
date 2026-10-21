import { describe, it, expect } from 'vitest'
import {
  toMediaPath,
  thumbUrlFor,
  imageSrcSet,
  videoPosterUrl,
  videoMetaUrl,
  downloadUrlFor,
} from '../media'

describe('媒体地址工具', () => {
  it('解析本站文件路径，包括旧数据里的 %2F', () => {
    expect(toMediaPath('https://hanphone.top/blog/essay/foo.mp4')).toBe('blog/essay/foo.mp4')
    expect(toMediaPath('https://hanphone.top/blog%2Fessay/foo.png')).toBe('blog/essay/foo.png')
    expect(toMediaPath('https://www.hanphone.top/blog/atlas/a.jpg')).toBe('blog/atlas/a.jpg')
    expect(toMediaPath('/blog/essay/a.jpg')).toBe('blog/essay/a.jpg')
    expect(toMediaPath('https://hanphone.top/blog/essay/%E4%B8%AD%E6%96%87.mp4')).toBe(
      'blog/essay/中文.mp4'
    )
  })

  it('外链、blob、派生地址返回 null', () => {
    expect(toMediaPath('https://example.com/a.mp4')).toBeNull()
    expect(toMediaPath('blob:https://hanphone.cn/abc')).toBeNull()
    expect(toMediaPath('data:image/png;base64,xxx')).toBeNull()
    expect(toMediaPath('https://hanphone.top/media/thumb?path=x')).toBeNull()
    expect(toMediaPath('')).toBeNull()
    expect(toMediaPath(null)).toBeNull()
  })

  it('生成缩略图 / srcset / 海报 / 元信息地址', () => {
    const url = 'https://hanphone.top/blog/essay/foo.png'
    expect(thumbUrlFor(url, 800)).toBe(
      'https://hanphone.top/media/thumb?path=blog%2Fessay%2Ffoo.png&w=800'
    )
    // 非法档位回退 800
    expect(thumbUrlFor(url, 999)).toContain('w=800')

    const srcset = imageSrcSet(url, [320, 800, 1600], 1000)
    expect(srcset).toContain(' 320w')
    expect(srcset).toContain(' 800w')
    expect(srcset).not.toContain(' 1600w')
    // 原图本身作为 1000w 候选，避免只能选 320w 被放大
    expect(srcset).toContain('/blog/essay/foo.png 1000w')

    expect(videoPosterUrl('https://hanphone.top/blog/essay/a.mp4')).toBe(
      'https://hanphone.top/media/poster.jpg?path=blog%2Fessay%2Fa.mp4'
    )
    expect(videoMetaUrl('https://hanphone.top/blog/essay/a.mp4')).toBe(
      'https://hanphone.top/media/meta?path=blog%2Fessay%2Fa.mp4'
    )
    expect(videoPosterUrl('https://example.com/a.mp4')).toBeNull()
  })

  it('下载地址只对本站文件追加 download=1', () => {
    expect(downloadUrlFor('https://hanphone.top/blog/essay/a.mp4')).toBe(
      'https://hanphone.top/blog/essay/a.mp4?download=1'
    )
    expect(downloadUrlFor('https://hanphone.top/blog/essay/a.mp4?x=1')).toBe(
      'https://hanphone.top/blog/essay/a.mp4?x=1&download=1'
    )
    expect(downloadUrlFor('https://example.com/a.mp4')).toBe('https://example.com/a.mp4')
    expect(downloadUrlFor('')).toBe('')
  })
})
