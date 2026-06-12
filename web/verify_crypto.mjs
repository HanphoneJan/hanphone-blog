// Run: node --input-type=module verify_crypto.cjs
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function deriveKey(key) {
  return crypto.createHash('sha256').update(key).digest()
}

function encryptCookie(plain, key) {
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

function decryptCookie(payload, key) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(key),
    Buffer.from(payload.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  let decrypted = decipher.update(payload.encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const key = 'test-key-32-bytes-long!!!!!!!!'
const plain = 'MUSIC_U=abc123; __csrf=xyz789'
const payload = encryptCookie(plain, key)
const decrypted = decryptCookie(payload, key)

console.log(decrypted === plain ? 'PASS: encrypt/decrypt' : 'FAIL')
try {
  decryptCookie(payload, 'wrong-key!!!!!!!!!!!!!!!!!')
  console.log('FAIL: should throw')
} catch {
  console.log('PASS: wrong key throws')
}
console.log('All tests passed!')
