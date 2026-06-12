// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, existsSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { encryptCookie, decryptCookie } from './crypto'

describe('网易云 Cookie 加解密', () => {
  it('应该能正确加密并解密回原字符串', () => {
    const key = 'this-is-a-test-key-32-bytes-long!'
    const plain = 'MUSIC_U=abc123; __csrf=xyz789'

    const payload = encryptCookie(plain, key)
    expect(payload.iv).toBeDefined()
    expect(payload.authTag).toBeDefined()
    expect(payload.encrypted).toBeDefined()
    expect(payload.updatedAt).toBeDefined()

    const decrypted = decryptCookie(payload, key)
    expect(decrypted).toBe(plain)
  })

  it('错误密钥解密应抛出异常', () => {
    const key = 'this-is-a-test-key-32-bytes-long!'
    const wrongKey = 'wrong-key-32-bytes-long!!!!!!'
    const plain = 'MUSIC_U=abc123'

    const payload = encryptCookie(plain, key)
    expect(() => decryptCookie(payload, wrongKey)).toThrow()
  })
})

describe('网易云 Cookie 文件存储', () => {
  let tempDir: string
  let originalCwd: () => string

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'netease-cookie-'))
    originalCwd = process.cwd
    process.cwd = () => tempDir
  })

  afterEach(() => {
    process.cwd = originalCwd
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('应该能保存并读取加密 Cookie', async () => {
    const { encryptCookie, decryptCookie, loadEncryptedCookie, saveEncryptedCookie, COOKIE_FILE } =
      await import('./crypto')
    const key = 'test-key-32-bytes-long!!!!!!!!'
    const plain = 'MUSIC_U=hello_world'

    const payload = encryptCookie(plain, key)
    saveEncryptedCookie(payload)

    expect(existsSync(COOKIE_FILE)).toBe(true)

    const loaded = loadEncryptedCookie()
    expect(loaded).not.toBeNull()
    const decrypted = decryptCookie(loaded!, key)
    expect(decrypted).toBe(plain)
  })
})
