import type {
  ProviderAdapter,
  ProviderAccount,
  ProviderAccountStatus,
  ProviderCredentials,
  RawCategory,
  RawSeries,
  RawStream,
  RawStreamUrl,
} from './types'
import type { ContentType } from '@/lib/types/tv'

export class MainProviderAdapter implements ProviderAdapter {
  private readonly creds: ProviderCredentials
  private readonly baseUrl: string

  constructor(credentials: ProviderCredentials) {
    this.creds = credentials
    this.baseUrl = normalizeBaseUrl(credentials.base_url)
  }

  // ── Helpers internos ─────────────────────────────────────────────
  private async call<T>(action?: string, params?: Record<string, string | number | undefined>): Promise<T> {
    if (!this.creds.username || !this.creds.password) {
      throw new Error('Credenciais Xtream incompletas.')
    }

    const url = new URL(`${this.baseUrl}/player_api.php`)
    url.searchParams.set('username', this.creds.username)
    url.searchParams.set('password', this.creds.password)
    if (action) url.searchParams.set('action', action)
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Number(process.env.XTREAM_TIMEOUT_MS || 15_000))
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
      const text = await response.text()
      if (!response.ok) throw new Error(`Xtream HTTP ${response.status}: ${text.slice(0, 160)}`)
      return JSON.parse(text) as T
    } finally {
      clearTimeout(timeout)
    }
  }

  // ── Contas / clientes ────────────────────────────────────────────
  async createUser(input: { plan_ref: string; note?: string }): Promise<ProviderAccount> {
    const expiresAt = addMonthsIso(planRefToMonths(input.plan_ref))
    return {
      account_id: this.creds.username || 'env',
      username: this.creds.username || '',
      password: this.creds.password || '',
      expires_at: expiresAt,
      max_connections: 1,
      status: 'active',
    }
  }

  async renewUser(accountId: string, input: { months: number }): Promise<ProviderAccount> {
    return {
      account_id: accountId,
      username: this.creds.username || accountId,
      password: this.creds.password || '',
      expires_at: addMonthsIso(input.months),
      max_connections: 1,
      status: 'active',
    }
  }

  async blockUser(_accountId: string): Promise<void> {
    return undefined
  }

  async unblockUser(_accountId: string): Promise<void> {
    return undefined
  }

  async getUserStatus(_accountId: string): Promise<ProviderAccountStatus> {
    const auth = await this.call<XtreamAuth>()
    const info = auth.user_info || {}
    return {
      status: normalizeStatus(info.status, info.exp_date),
      expires_at: unixToIso(info.exp_date),
      active_connections: Number(info.active_cons || 0),
      max_connections: Number(info.max_connections || 1),
    }
  }

  async getAccountInfo(accountId: string): Promise<ProviderAccount> {
    const status = await this.getUserStatus(accountId)
    return {
      account_id: accountId,
      username: this.creds.username || accountId,
      password: this.creds.password || '',
      expires_at: status.expires_at,
      max_connections: status.max_connections,
      status: status.status,
    }
  }

  // ── Catálogo ─────────────────────────────────────────────────────
  async getLiveCategories(): Promise<RawCategory[]> {
    const data = await this.call<XtreamCategory[]>('get_live_categories')
    return normalizeCategories(data, 'live')
  }

  async getLiveStreams(categoryRef?: string): Promise<RawStream[]> {
    const data = await this.call<XtreamStream[]>('get_live_streams', { category_id: categoryRef })
    return normalizeStreams(data, 'live')
  }

  async getVodCategories(): Promise<RawCategory[]> {
    const data = await this.call<XtreamCategory[]>('get_vod_categories')
    return normalizeCategories(data, 'vod')
  }

  async getVodStreams(categoryRef?: string): Promise<RawStream[]> {
    const data = await this.call<XtreamStream[]>('get_vod_streams', { category_id: categoryRef })
    return normalizeStreams(data, 'vod')
  }

  async getSeriesCategories(): Promise<RawCategory[]> {
    const data = await this.call<XtreamCategory[]>('get_series_categories')
    return normalizeCategories(data, 'series')
  }

  async getSeries(categoryRef?: string): Promise<RawSeries[]> {
    const data = await this.call<XtreamSeries[]>('get_series', { category_id: categoryRef })
    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        provider_ref: String(item.series_id || ''),
        name: String(item.name || item.title || `Série ${item.series_id || ''}`).trim(),
        cover: cleanUrl(item.cover || item.stream_icon),
        category_ref: String(item.category_id || firstCategory(item.category_ids) || ''),
        seasons: Array.isArray(item.seasons) ? item.seasons.length : undefined,
      }))
      .filter((item) => item.provider_ref && item.name)
  }

  // ── Reprodução ───────────────────────────────────────────────────
  async getStreamUrl(input: {
    account: ProviderAccount
    provider_ref: string
    type: ContentType
  }): Promise<RawStreamUrl> {
    const extension = input.type === 'live' ? 'ts' : 'mp4'
    const path = input.type === 'live' ? 'live' : input.type === 'vod' ? 'movie' : 'series'
    return {
      url: `${this.baseUrl}/${path}/${encodeURIComponent(input.account.username)}/${encodeURIComponent(input.account.password)}/${encodeURIComponent(input.provider_ref)}.${extension}`,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }
  }
}

type XtreamAuth = {
  user_info?: {
    status?: string
    exp_date?: string
    active_cons?: string
    max_connections?: string
  }
}

type XtreamCategory = {
  category_id?: string | number
  category_name?: string
}

type XtreamStream = {
  stream_id?: string | number
  name?: string
  title?: string
  stream_icon?: string
  cover?: string
  category_id?: string | number
  category_ids?: unknown
  container_extension?: string
  direct_source?: string
}

type XtreamSeries = XtreamStream & {
  series_id?: string | number
  seasons?: unknown[]
}

function normalizeBaseUrl(value: string) {
  const clean = String(value || '').trim().replace(/\/+$/, '')
  if (!clean) throw new Error('XTREAM_BASE_URL ausente.')
  return /^https?:\/\//i.test(clean) ? clean : `http://${clean}`
}

function normalizeStatus(status?: string, expDate?: string): ProviderAccountStatus['status'] {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('disabled') || normalized.includes('banned')) return 'blocked'
  const expiresAt = unixToIso(expDate)
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired'
  return 'active'
}

function unixToIso(value?: string | number | null) {
  const timestamp = Number(value || 0)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  return new Date(timestamp * 1000).toISOString()
}

function addMonthsIso(months: number) {
  const date = new Date()
  date.setMonth(date.getMonth() + Math.max(months || 1, 1))
  return date.toISOString()
}

function planRefToMonths(planRef: string) {
  const value = String(planRef || '').toLowerCase()
  if (value.includes('anual') || value.includes('12')) return 12
  if (value.includes('semestral') || value.includes('6')) return 6
  if (value.includes('tri') || value.includes('3')) return 3
  return 1
}

function cleanUrl(value: unknown) {
  const text = String(value || '').trim()
  return /^https?:\/\//i.test(text) ? text : undefined
}

function firstCategory(value: unknown) {
  if (Array.isArray(value)) return value[0]
  return undefined
}

function inferQuality(name: string): RawStream['quality'] {
  const text = name.toUpperCase()
  if (text.includes('4K') || text.includes('UHD')) return '4K'
  if (text.includes('FHD') || text.includes('1080')) return 'FHD'
  if (text.includes('HD') || text.includes('720')) return 'HD'
  return 'SD'
}

function normalizeCategories(data: XtreamCategory[], type: ContentType): RawCategory[] {
  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      provider_ref: String(item.category_id || '').trim(),
      name: String(item.category_name || 'Sem categoria').trim() || 'Sem categoria',
      type,
    }))
    .filter((item) => item.provider_ref)
}

function normalizeStreams(data: XtreamStream[], type: ContentType): RawStream[] {
  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const providerRef = String(item.stream_id || '').trim()
      const name = String(item.name || item.title || `${type === 'live' ? 'Canal' : 'Filme'} ${providerRef}`).trim()
      return {
        provider_ref: providerRef,
        name,
        logo: cleanUrl(item.stream_icon || item.cover),
        category_ref: String(item.category_id || firstCategory(item.category_ids) || '').trim(),
        type,
        quality: inferQuality(name),
        group_key: name.toLowerCase().replace(/\b(fhd|hd|sd|4k|uhd|h265|backup|alt|\d+p)\b/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      }
    })
    .filter((item) => item.provider_ref && item.name)
}
