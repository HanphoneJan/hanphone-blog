import Compressor from 'compressorjs'
import { ENDPOINTS } from '@/lib/api'

/**
 * 未登录场景的公开图片上传（前台申请友链等）。
 *
 * 对应 admin-file 的 `POST /upload/public-image`：仅图片、≤10MB、按 IP 限流。
 * 不走 `apiClient`，因为没有登录 Token；也不要把用户凭证带过去。
 */
export async function uploadPublicImage(file: File): Promise<string> {
  const compressed = await compress(file)
  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('filename', compressed.name.replace(/\.[^.]+$/, ''))

  const response = await fetch(ENDPOINTS.FILE.PUBLIC_IMAGE_UPLOAD, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || `上传失败（${response.status}）`)
  }
  if (!data?.url) {
    throw new Error(data?.error || '上传接口未返回图片地址')
  }
  return data.url as string
}

function compress(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      // GIF/SVG 压缩会丢帧或改语义，直接原样上传
      resolve(file)
      return
    }
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1280,
      maxHeight: 1280,
      mimeType: 'image/jpeg',
      convertSize: 102400,
      success(result) {
        resolve(
          new File([result], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
        )
      },
      error() {
        // 压缩失败就退回原文件，让服务端的大小/类型校验给出明确错误
        resolve(file)
      },
    })
  })
}
