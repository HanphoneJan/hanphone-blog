import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

const DATA_DIR = path.join(process.cwd(), 'data')
export const COOKIE_FILE = path.join(DATA_DIR, 'netease-cookie.enc')

export interface EncryptedCookiePayload {
  iv: string
  authTag: string
  encrypted: string
  updatedAt: string
}

/** 将任意长度密钥派生为 32 字节 Buffer */
function deriveKey(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest()
}

export function encryptCookie(plain: string, key: string): EncryptedCookiePayload {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(key), iv)
  let encrypted = cipher.update(plain, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encrypted,
    updatedAt: new Date().toISOString(),
  }
}

export function decryptCookie(payload: EncryptedCookiePayload, key: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(key),
    Buffer.from(payload.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  let decrypted = decipher.update(payload.encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function loadEncryptedCookie(): EncryptedCookiePayload | null {
  if (!fs.existsSync(COOKIE_FILE)) return null
  const raw = fs.readFileSync(COOKIE_FILE, 'utf8')
  return JSON.parse(raw) as EncryptedCookiePayload
}

export function saveEncryptedCookie(payload: EncryptedCookiePayload): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 })
  }
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 })
}
