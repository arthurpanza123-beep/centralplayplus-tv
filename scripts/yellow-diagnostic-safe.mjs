#!/usr/bin/env node
import fs from 'node:fs'

loadEnv('.env.local')

const apiUrl = process.env.YELLOWBOX_API_URL || process.env.YELLOW_BOX_API_URL || process.env.YELLOW_BOX_FULL_API_URL
const report = {
  yellow_api_called: 'no',
  extracted_username: 'EMPTY',
  extracted_password: 'EMPTY',
  extracted_xtream_base: 'EMPTY',
  base_shape: 'invalid',
  player_api: 'n/a',
  live_streams_count: 'n/a',
  vod_streams_count: 'n/a',
  series_count: 'n/a',
  playback_sample_ok: '0/0',
}

try {
  if (!apiUrl) throw new Error('yellow_api_missing')
  const raw = await callYellow(apiUrl)
  report.yellow_api_called = 'yes'
  const parsed = parseYellow(raw)
  report.extracted_username = parsed.username ? 'SET' : 'EMPTY'
  report.extracted_password = parsed.password ? 'SET' : 'EMPTY'
  report.extracted_xtream_base = parsed.base ? 'SET' : 'EMPTY'
  report.base_shape = baseShape(parsed.base)

  if (parsed.username && parsed.password && parsed.base) {
    const player = await callXtream(parsed.base, parsed.username, parsed.password)
    report.player_api = String(player.status)
    const live = await callXtream(parsed.base, parsed.username, parsed.password, 'get_live_streams')
    const vod = await callXtream(parsed.base, parsed.username, parsed.password, 'get_vod_streams')
    const series = await callXtream(parsed.base, parsed.username, parsed.password, 'get_series')
    report.live_streams_count = live.array ? String(live.count) : 'n/a'
    report.vod_streams_count = vod.array ? String(vod.count) : 'n/a'
    report.series_count = series.array ? String(series.count) : 'n/a'

    let ok = 0
    const sample = live.array ? live.data.slice(0, 3) : []
    for (const item of sample) {
      const streamId = String(item.stream_id || '')
      if (!streamId) continue
      const url = `${parsed.base}/live/${encodeURIComponent(parsed.username)}/${encodeURIComponent(parsed.password)}/${encodeURIComponent(streamId)}.ts`
      if (await looksPlayable(url)) ok++
    }
    report.playback_sample_ok = `${ok}/${sample.length}`
  }
} catch (error) {
  if (report.yellow_api_called === 'no' && apiUrl) report.yellow_api_called = 'yes'
}

for (const [key, value] of Object.entries(report)) console.log(`${key}: ${value}`)

function loadEnv(path) {
  if (!fs.existsSync(path)) return
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!(match[1] in process.env)) process.env[match[1]] = value
  }
}

async function callYellow(url) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.YELLOW_BOX_API_KEY ? { authorization: `Bearer ${process.env.YELLOW_BOX_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      source: 'centralplayplus-tv-diagnostic',
      device_key: `DG${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      client_name: process.env.DEFAULT_YELLOWBOX_CLIENT || 'Central Play Plus',
      plan: process.env.DEFAULT_ACTIVATION_PLAN || 'Mensal',
      days: Number(process.env.DEFAULT_ACTIVATION_DAYS || 30),
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`yellow_http_${response.status}`)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function parseYellow(raw) {
  const candidates = collect(raw)
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:：=-]{2,80})\s*[:：=-]\s*(.+?)\s*$/)
    if (match) candidates.push({ label: match[1], value: match[2] })
  }
  const username = first(candidates, (label) => /\b(usuario|user|username|login|xtream_username)\b/.test(clean(label)) && !ignored(label))
  const password = first(candidates, (label) => /\b(senha|password|pass|xtream_password)\b/.test(clean(label)) && !ignored(label))
  const dns = firstBase(candidates, (label) => /\b(dns|servidor|server|host|url|base)\b/.test(clean(label)) && !/\bm3u|hls|lista|playlist|link\b/.test(clean(label)) && !ignored(label))
  const m3u = firstUrl(candidates, (label) => /\bm3u|lista|playlist\b/.test(clean(label)) && !ignored(label)) || firstUrlFromText(text, /get\.php|type=m3u|output=ts/i)
  const hls = firstUrl(candidates, (label) => /\bhls|m3u8\b/.test(clean(label)) && !ignored(label)) || firstUrlFromText(text, /\.m3u8|output=hls|type=hls/i)
  return { username, password, base: dns || normalizeBase(m3u) || normalizeBase(hls) }
}

function collect(value, label = '', out = []) {
  if (value === null || value === undefined) return out
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim()
    if (text) out.push({ label, value: text })
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, `${label}[${index}]`, out))
    return out
  }
  if (typeof value === 'object') for (const [key, item] of Object.entries(value)) collect(item, key, out)
  return out
}

function clean(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function ignored(label) {
  return /smart|smart\s*up|smart\s*stb|web\s*player|webplayer|checkout|ssiptv|playsim|blessed|codigo|code|app\b/.test(clean(label))
}

function first(candidates, predicate) {
  const item = candidates.find((candidate) => predicate(candidate.label) && String(candidate.value || '').trim())
  return item ? strip(item.value) : ''
}

function firstBase(candidates, predicate) {
  for (const candidate of candidates) {
    if (!predicate(candidate.label)) continue
    const base = normalizeBase(candidate.value)
    if (base) return base
  }
  return ''
}

function firstUrl(candidates, predicate) {
  for (const candidate of candidates) {
    if (!predicate(candidate.label)) continue
    const url = extractUrl(candidate.value)
    if (url) return url
  }
  return ''
}

function firstUrlFromText(text, hint) {
  const urls = text.match(/https?:\/\/[^\s"'<>]+|(?:[a-z0-9.-]+\.[a-z]{2,}:\d{2,5}\/[^\s"'<>]+)/gi) || []
  return urls.find((url) => hint.test(url) && !/smart|webplayer|checkout|ssiptv|playsim|blessed/i.test(url)) || ''
}

function extractUrl(value) {
  const match = String(value || '').match(/https?:\/\/[^\s"'<>]+|(?:[a-z0-9.-]+\.[a-z]{2,}:\d{2,5}\/[^\s"'<>]+)/i)
  return match && !/smart|webplayer|checkout|ssiptv|playsim|blessed/i.test(match[0]) ? match[0] : ''
}

function strip(value) {
  return String(value || '').trim().replace(/^["'`]+|["'`,.;]+$/g, '').trim()
}

function normalizeBase(value) {
  let text = strip(value).replace(/&amp;/g, '&')
  if (!text) return ''
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`
  try {
    const url = new URL(text)
    url.username = ''
    url.password = ''
    url.hash = ''
    url.search = ''
    url.pathname = url.pathname
      .replace(/\/(live|movie|series)\/[^/]+\/[^/]+\/.*$/i, '')
      .replace(/\/(get|player_api|xmltv)\.php$/i, '')
      .replace(/\/+$/, '')
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function baseShape(base) {
  if (!base) return 'invalid'
  try {
    const url = new URL(base)
    return url.pathname && url.pathname !== '/' ? 'has_path' : 'clean'
  } catch {
    return 'invalid'
  }
}

async function callXtream(base, username, password, action) {
  const url = new URL(`${base}/player_api.php`)
  url.searchParams.set('username', username)
  url.searchParams.set('password', password)
  if (action) url.searchParams.set('action', action)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    const text = await response.text()
    let data = null
    try {
      data = JSON.parse(text)
    } catch {}
    return { status: response.status, array: Array.isArray(data), count: Array.isArray(data) ? data.length : 0, data: Array.isArray(data) ? data : [] }
  } catch {
    return { status: 'ERROR', array: false, count: 0, data: [] }
  } finally {
    clearTimeout(timeout)
  }
}

async function looksPlayable(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { range: 'bytes=0-255', accept: '*/*' } })
    const text = await response.text().catch(() => '')
    return response.ok && !/<html|<!doctype|not found|forbidden|unauthorized|error/i.test(text.slice(0, 256))
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}
