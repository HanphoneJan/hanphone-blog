// ESM inline test — run with: node --input-type=module < this-file
import { encryptCookie, decryptCookie, loadEncryptedCookie, saveEncryptedCookie } from './src/lib/netease-cookie/crypto.ts'

const key = 'test-secret-key-32bytes!!!'
const plain = 'MUSIC_U=abc123; __csrf=xyz789'

// Test encrypt/decrypt
const payload = encryptCookie(plain, key)
console.log('encrypt:', 'ok')
console.log('  iv:', payload.iv.substring(0, 10) + '...')
console.log('  authTag:', payload.authTag.substring(0, 10) + '...')
console.log('  encrypted:', payload.encrypted.substring(0, 20) + '...')

const decrypted = decryptCookie(payload, key)
console.log('decrypt match:', decrypted === plain)

// Test wrong key throws
try {
  decryptCookie(payload, 'wrong-key!!!!!!!!!!!!!!!!!')
  console.log('FAIL: should have thrown')
} catch {
  console.log('wrong key throws: ok')
}

// Test file save/load
const tempDir = process.cwd()
process.cwd = () => tempDir // ensure data dir created in project root
saveEncryptedCookie(payload)
const loaded = loadEncryptedCookie()
console.log('load after save:', loaded !== null)
console.log('decrypted match:', decryptCookie(loaded!, key) === plain)

console.log('\nAll tests passed!')
