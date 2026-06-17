import { normalizeXtreamBaseUrl } from './xtream-url'

export type YellowActivationParsed = {
  username: string
  password: string
  xtreamBaseUrl: string
  m3uUrl: string
  hlsUrl: string
  expiresAt: string | null
}

type Candidate = {
  label: string
  value: string
}

const EMPTY_PARSED: YellowActivationParsed = {
  username: '',
  password: '',
  xtreamBaseUrl: '',
  m3uUrl: '',
  hlsUrl: '',
  expiresAt: null,
}

export function parseYellowActivationResponse(raw: unknown): YellowActivationParsed {
  const candidates = collectCandidates(raw)
  const text = rawToText(raw)
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:：=-]{2,80})\s*[:：=-]\s*(.+?)\s*$/)
    if (match) candidates.push({ label: match[1], value: match[2] })
  }

  const username = firstValue(candidates, isUsernameLabel) || extractLooseCredential(text, 'username')
  const password = firstValue(candidates, isPasswordLabel) || extractLooseCredential(text, 'password')
  const m3uUrl = firstUrl(candidates, isM3uLabel) || firstUrlFromText(text, /get\.php|type=m3u|output=ts/i)
  const hlsUrl = firstUrl(candidates, isHlsLabel) || firstUrlFromText(text, /\.m3u8|output=hls|type=hls/i)
  const dnsBase = firstBase(candidates, isPrimaryDnsLabel)
  const fallbackBase = normalizeXtreamBaseUrl(m3uUrl) || normalizeXtreamBaseUrl(hlsUrl)
  const expiresAt = firstExpiry(candidates) || extractExpiryFromText(text)

  return {
    ...EMPTY_PARSED,
    username,
    password,
    xtreamBaseUrl: dnsBase || fallbackBase,
    m3uUrl,
    hlsUrl,
    expiresAt,
  }
}

function collectCandidates(value: unknown, label = '', out: Candidate[] = []): Candidate[] {
  if (value === null || value === undefined) return out
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim()
    if (text) out.push({ label, value: text })
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCandidates(item, `${label}[${index}]`, out))
    return out
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectCandidates(item, key, out)
  }
  return out
}

function rawToText(raw: unknown): string {
  if (typeof raw === 'string') return raw
  try {
    return JSON.stringify(raw)
  } catch {
    return ''
  }
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isIgnoredLabel(label: string) {
  const clean = normalizeLabel(label)
  return /smart|smart\s*up|smart\s*stb|web\s*player|webplayer|checkout|ssiptv|playsim|blessed|codigo|code|app\b/.test(clean)
}

function isUsernameLabel(label: string) {
  const clean = normalizeLabel(label)
  return !isIgnoredLabel(label) && /\b(usuario|user|username|login|xtream_username)\b/.test(clean)
}

function isPasswordLabel(label: string) {
  const clean = normalizeLabel(label)
  return !isIgnoredLabel(label) && /\b(senha|password|pass|xtream_password)\b/.test(clean)
}

function isPrimaryDnsLabel(label: string) {
  const clean = normalizeLabel(label)
  return !isIgnoredLabel(label) && /\b(dns|servidor|server|host|url|base)\b/.test(clean) && !/\bm3u|hls|lista|playlist|link\b/.test(clean)
}

function isM3uLabel(label: string) {
  const clean = normalizeLabel(label)
  return !isIgnoredLabel(label) && /\bm3u|lista|playlist\b/.test(clean)
}

function isHlsLabel(label: string) {
  const clean = normalizeLabel(label)
  return !isIgnoredLabel(label) && /\bhls|m3u8\b/.test(clean)
}

function firstValue(candidates: Candidate[], predicate: (label: string) => boolean) {
  const item = candidates.find((candidate) => predicate(candidate.label) && candidate.value.trim())
  return item ? stripDecorations(item.value) : ''
}

function firstBase(candidates: Candidate[], predicate: (label: string) => boolean) {
  for (const candidate of candidates) {
    if (!predicate(candidate.label)) continue
    const base = normalizeXtreamBaseUrl(stripDecorations(candidate.value))
    if (base) return base
  }
  return ''
}

function firstUrl(candidates: Candidate[], predicate: (label: string) => boolean) {
  for (const candidate of candidates) {
    if (!predicate(candidate.label)) continue
    const url = extractUrl(candidate.value)
    if (url) return url
  }
  return ''
}

function firstUrlFromText(text: string, hint: RegExp) {
  const urls = text.match(/https?:\/\/[^\s"'<>]+|(?:[a-z0-9.-]+\.[a-z]{2,}:\d{2,5}\/[^\s"'<>]+)/gi) || []
  return urls.find((url) => hint.test(url) && !isIgnoredUrl(url)) || ''
}

function extractUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s"'<>]+|(?:[a-z0-9.-]+\.[a-z]{2,}:\d{2,5}\/[^\s"'<>]+)/i)
  return match && !isIgnoredUrl(match[0]) ? match[0] : ''
}

function isIgnoredUrl(value: string) {
  return /smart|webplayer|web-player|checkout|ssiptv|playsim|blessed/i.test(value)
}

function stripDecorations(value: string) {
  return value.trim().replace(/^["'`]+|["'`,.;]+$/g, '').trim()
}

function extractLooseCredential(text: string, kind: 'username' | 'password') {
  const label = kind === 'username' ? '(usuario|usuário|user|username|login)' : '(senha|password|pass)'
  const match = text.match(new RegExp(`${label}\\s*[:：=-]\\s*([^\\s"'<>]+)`, 'i'))
  return match ? stripDecorations(match[2]) : ''
}

function firstExpiry(candidates: Candidate[]) {
  for (const candidate of candidates) {
    const clean = normalizeLabel(candidate.label)
    if (!/\b(expira|validade|vencimento|expires|expiration|exp_date)\b/.test(clean)) continue
    const value = parseExpiry(candidate.value)
    if (value) return value
  }
  return null
}

function extractExpiryFromText(text: string) {
  const match = text.match(/\b(expira|validade|vencimento|expires|expiration)\b\s*[:：=-]\s*([^\n\r]+)/i)
  return match ? parseExpiry(match[2]) : null
}

function parseExpiry(value: string) {
  const text = stripDecorations(value)
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000).toISOString()
  if (/^\d{13}$/.test(text)) return new Date(Number(text)).toISOString()
  const br = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?\b/)
  if (br) {
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3])
    const date = new Date(Date.UTC(year, Number(br[2]) - 1, Number(br[1]), Number(br[4] || 0), Number(br[5] || 0)))
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
