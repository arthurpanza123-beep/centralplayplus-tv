import crypto from 'crypto'

type TokenKind = 'access' | 'refresh' | 'stream'

export type AccessClaims = {
  kind: 'access'
  device_id: string
  device_key: string
  client_id: string | null
}

export type RefreshClaims = {
  kind: 'refresh'
  device_id: string
  device_key: string
}

export type StreamClaims = {
  kind: 'stream'
  device_id: string
  device_key: string
  channel_id: string
  variant_id: string
  provider_ref: string
  type: 'live' | 'vod' | 'series'
}

type Claims = AccessClaims | RefreshClaims | StreamClaims

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function secret(kind: TokenKind): string {
  if (kind === 'access') return process.env.TV_ACCESS_TOKEN_SECRET || process.env.ADMIN_API_KEY || 'centralplayplus-local-access-secret'
  if (kind === 'refresh') return process.env.TV_REFRESH_TOKEN_SECRET || process.env.ADMIN_API_KEY || 'centralplayplus-local-refresh-secret'
  return process.env.TV_STREAM_TOKEN_SECRET || process.env.TV_ACCESS_TOKEN_SECRET || process.env.ADMIN_API_KEY || 'centralplayplus-local-stream-secret'
}

function ttlSeconds(kind: TokenKind) {
  if (kind === 'access') return Number(process.env.TV_ACCESS_TOKEN_TTL_SECONDS || 60 * 60 * 12)
  if (kind === 'refresh') return Number(process.env.TV_REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 30)
  return Number(process.env.TV_STREAM_TOKEN_TTL_SECONDS || 60 * 5)
}

function sign(data: string, kind: TokenKind) {
  return crypto.createHmac('sha256', secret(kind)).update(data).digest('base64url')
}

function tokenFor<T extends Claims>(claims: T, kind: TokenKind, ttl = ttlSeconds(kind)) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    ...claims,
    iat: now,
    exp: now + ttl,
  }
  const encoded = base64url(JSON.stringify(payload))
  return `${encoded}.${sign(encoded, kind)}`
}

function verify<T extends Claims>(token: string, kind: TokenKind): (T & { iat: number; exp: number }) | null {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  const expected = sign(encoded, kind)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null
  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T & { iat: number; exp: number; kind?: string }
    if (claims.kind !== kind) return null
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null
    return claims
  } catch {
    return null
  }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function issueAccessToken(claims: Omit<AccessClaims, 'kind'>) {
  return tokenFor({ ...claims, kind: 'access' }, 'access')
}

export function issueRefreshToken(claims: Omit<RefreshClaims, 'kind'>) {
  return tokenFor({ ...claims, kind: 'refresh' }, 'refresh')
}

export function issueStreamToken(claims: Omit<StreamClaims, 'kind'>) {
  return tokenFor({ ...claims, kind: 'stream' }, 'stream')
}

export function verifyAccessToken(token: string) {
  return verify<AccessClaims>(token, 'access')
}

export function verifyRefreshToken(token: string) {
  return verify<RefreshClaims>(token, 'refresh')
}

export function verifyStreamToken(token: string) {
  return verify<StreamClaims>(token, 'stream')
}

export function accessTokenExpiresAt() {
  return new Date(Date.now() + ttlSeconds('access') * 1000).toISOString()
}

export function refreshTokenExpiresAt() {
  return new Date(Date.now() + ttlSeconds('refresh') * 1000).toISOString()
}
