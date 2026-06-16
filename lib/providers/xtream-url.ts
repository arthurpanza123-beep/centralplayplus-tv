const XTREAM_PATH_RE = /\/(get|player_api|xmltv)\.php$/i
const STREAM_PATH_RE = /\/(live|movie|series)\/[^/]+\/[^/]+\/.*$/i

export function normalizeXtreamBaseUrl(value: unknown): string {
  let text = String(value || '').trim()
  if (!text) return ''

  text = text.replace(/&amp;/g, '&')
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`

  let url: URL
  try {
    url = new URL(text)
  } catch {
    return ''
  }

  url.username = ''
  url.password = ''
  url.hash = ''
  url.search = ''
  url.pathname = url.pathname
    .replace(STREAM_PATH_RE, '')
    .replace(XTREAM_PATH_RE, '')
    .replace(/\/+$/, '')

  return url.toString().replace(/\/+$/, '')
}

export function extractXtreamBaseUrl(value: unknown): string {
  const candidates = collectStrings(value)
  for (const candidate of candidates) {
    if (!looksLikeProviderCandidate(candidate)) continue
    const normalized = normalizeXtreamBaseUrl(candidate)
    if (normalized) return normalized
  }
  return ''
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/dns|host|server|base|url|m3u|link|playlist|xtream/i.test(key)) collectStrings(item, out)
      else if (typeof item === 'object') collectStrings(item, out)
    }
  }
  return out
}

function looksLikeProviderCandidate(value: string) {
  const text = value.trim()
  if (!text) return false
  if (/device\.centralplayplus\.com\.br|api\/chatbot|whatsapp|wa\.me/i.test(text)) return false
  if (/player_api\.php|get\.php|xmltv\.php|\/live\/|\/movie\/|\/series\//i.test(text)) return true
  return /^https?:\/\/[^/\s:]+:\d{2,5}(?:\/|$)/i.test(text) || /^[^/\s:]+:\d{2,5}(?:\/|$)/i.test(text)
}
