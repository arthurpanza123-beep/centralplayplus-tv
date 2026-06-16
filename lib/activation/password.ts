import crypto from 'crypto'

function timingSafeEqualText(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function verifyActivationPassword(password: string) {
  const plain = process.env.TV_ACTIVATION_PASSWORD
  const hash = process.env.TV_ACTIVATION_PASSWORD_HASH
  if (!plain && !hash) return false

  if (hash) {
    const digest = crypto.createHash('sha256').update(password).digest('hex')
    return timingSafeEqualText(digest, hash.trim().toLowerCase())
  }
  return timingSafeEqualText(password, plain || '')
}
