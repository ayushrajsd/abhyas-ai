import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', MASTER_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decryptApiKey(stored: string): string {
  const [ivHex, tagHex, cipherHex] = stored.split(':')
  const decipher = createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8')
}
