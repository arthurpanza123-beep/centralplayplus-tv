import crypto from 'crypto'

import { apiError } from '@/lib/api/helpers'
import { getDefaultServer, getProviderServerById, credentialsFromServer, providerAccountFromCredentials } from '@/lib/catalog/service'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
import { normalizeXtreamBaseUrl } from '@/lib/providers/xtream-url'
import { extractYellowXtreamBaseCandidates, parseYellowActivationResponse, type YellowActivationParsed } from '@/lib/providers/yellow-parser'
import type { ProviderAccount } from '@/lib/providers/types'
import {
  accessTokenExpiresAt,
  hashToken,
  issueAccessToken,
  issueRefreshToken,
  refreshTokenExpiresAt,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/lib/security/tokens'
import type { DeviceStatus, Platform, RegisterDeviceRequest } from '@/lib/types/tv'

export type DeviceRow = {
  id: string
  device_key: string
  client_id: string | null
  server_id: string | null
  provider_account_id?: string | null
  install_id: string | null
  platform: Platform
  device_model: string | null
  app_version: string | null
  status: DeviceStatus
  activated_at: string | null
  expires_at: string | null
  last_seen_at: string | null
  created_at: string
}

type ProviderAccountRow = {
  id: string
  client_id: string
  server_id: string
  account_ref: string
  username: string
  password: string
  max_conns: number
  status: ProviderAccount['status']
  expires_at: string | null
}

type ProviderServerLike = {
  id: string
  name: string
  kind: 'xtream' | 'm3u' | 'custom' | 'yellowbox' | 'yellow_box' | 'yellow-box'
  base_url: string
  username: string | null
  password: string | null
  api_key: string | null
  m3u_url: string | null
}

export class ActivationProviderError extends Error {
  readonly code: string

  constructor(code: string, message = code) {
    super(message)
    this.name = 'ActivationProviderError'
    this.code = code
  }
}

export type FreshXtreamActivationValidation = {
  ok: boolean
  playerApiStatus: number
  liveStreamsCount: number
  vodStreamsCount?: number
  seriesCount?: number
  playbackSampleOk: number
  playbackSampleTotal: number
  accountStatus?: ProviderAccount['status']
  accountExpiresAt?: string | null
  safeReason?: string
}

const memoryDevices = new Map<string, DeviceRow>()
const memoryByInstall = new Map<string, string>()
const DEVICE_KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
let providerAccountLinkSchemaReady = false

function pendingDeviceTtlMs() {
  return Number(process.env.TV_DEVICE_KEY_TTL_MINUTES || 30) * 60_000
}

export function normalizeDeviceKey(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.startsWith('CP')) return `CP-${clean.slice(2, 8)}`
  return clean.slice(0, 4)
}

function generateDeviceKey() {
  return Array.from({ length: 4 }, () => DEVICE_KEY_ALPHABET[Math.floor(Math.random() * DEVICE_KEY_ALPHABET.length)]).join('')
}

function isPendingKeyExpired(device: DeviceRow) {
  if (device.status !== 'pending') return false
  return Date.now() - new Date(device.created_at).getTime() > pendingDeviceTtlMs()
}

function addDaysIso(days: number) {
  return new Date(Date.now() + Math.max(days || 30, 1) * 86400_000).toISOString()
}

async function ensureProviderAccountLinkSchema() {
  if (!isDatabaseConfigured || providerAccountLinkSchemaReady) return
  await sql`
    alter table tv_devices
    add column if not exists provider_account_id uuid references provider_accounts(id) on delete set null
  `
  await sql`create index if not exists idx_tv_devices_provider_account on tv_devices(provider_account_id)`
  providerAccountLinkSchemaReady = true
}

function planDays(plan: string, days?: number) {
  if (days) return days
  const value = String(plan || '').toLowerCase()
  if (value.includes('anual')) return 365
  if (value.includes('semestral')) return 180
  if (value.includes('tri')) return 90
  return 30
}

export async function registerDevice(input: RegisterDeviceRequest): Promise<DeviceRow> {
  if (!isDatabaseConfigured) {
    const existingKey = memoryByInstall.get(input.install_id)
    const existing = existingKey ? memoryDevices.get(existingKey) : null
    if (existing && !isPendingKeyExpired(existing)) return existing
    if (existingKey) {
      memoryDevices.delete(existingKey)
      memoryByInstall.delete(input.install_id)
    }
    const device_key = generateDeviceKey()
    const row: DeviceRow = {
      id: crypto.randomUUID(),
      device_key,
      client_id: null,
      server_id: null,
      install_id: input.install_id,
      platform: input.platform,
      device_model: input.device_model || null,
      app_version: input.app_version || null,
      status: 'pending',
      activated_at: null,
      expires_at: null,
      last_seen_at: null,
      created_at: new Date().toISOString(),
    }
    memoryDevices.set(device_key, row)
    memoryByInstall.set(input.install_id, device_key)
    return row
  }

  const existing = (await sql`
    select * from tv_devices
    where install_id = ${input.install_id}
    order by created_at desc
    limit 1
  `) as unknown as DeviceRow[]
  if (existing[0] && !isPendingKeyExpired(existing[0])) return existing[0]
  if (existing[0]?.status === 'pending') {
    for (let attempt = 0; attempt < 8; attempt++) {
      const deviceKey = generateDeviceKey()
      try {
        const rows = (await sql`
          update tv_devices
          set device_key = ${deviceKey},
              platform = ${input.platform},
              device_model = ${input.device_model || null},
              app_version = ${input.app_version || null},
              created_at = now()
          where id = ${existing[0].id}
          returning *
        `) as unknown as DeviceRow[]
        return rows[0]
      } catch (error) {
        if (!String(error).includes('duplicate')) throw error
      }
    }
    throw new Error('Não foi possível renovar uma Device Key única.')
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const deviceKey = generateDeviceKey()
    try {
      const rows = (await sql`
        insert into tv_devices (device_key, install_id, platform, device_model, app_version, status)
        values (${deviceKey}, ${input.install_id}, ${input.platform}, ${input.device_model || null}, ${input.app_version || null}, 'pending')
        returning *
      `) as unknown as DeviceRow[]
      return rows[0]
    } catch (error) {
      if (!String(error).includes('duplicate')) throw error
    }
  }
  throw new Error('Não foi possível gerar uma Device Key única.')
}

export async function getDeviceByKey(deviceKey: string): Promise<DeviceRow | null> {
  const key = normalizeDeviceKey(deviceKey)
  if (!isDatabaseConfigured) return memoryDevices.get(key) || null
  await ensureProviderAccountLinkSchema()
  const rows = (await sql`select * from tv_devices where device_key = ${key} limit 1`) as unknown as DeviceRow[]
  return rows[0] || null
}

function accountExpired(account: { expires_at: string | null }) {
  return Boolean(account.expires_at && new Date(account.expires_at).getTime() < Date.now())
}

function providerAccountFromRow(account: ProviderAccountRow): ProviderAccount {
  return {
    row_id: account.id,
    account_id: account.account_ref,
    server_id: account.server_id,
    username: account.username,
    password: account.password,
    expires_at: account.expires_at,
    max_connections: account.max_conns,
    status: accountExpired(account) ? 'expired' : account.status,
  }
}

export async function findProviderAccountForDevice(device: DeviceRow): Promise<ProviderAccount | null> {
  if (!device.client_id) return null
  if (!isDatabaseConfigured) {
    const server = await getDefaultServer()
    return providerAccountFromCredentials(credentialsFromServer(server))
  }
  await ensureProviderAccountLinkSchema()

  if (device.provider_account_id) {
    const linkedRows = (await sql`
      select * from provider_accounts
      where id = ${device.provider_account_id}
        and client_id = ${device.client_id}
      limit 1
    `) as unknown as ProviderAccountRow[]
    if (linkedRows[0]) return providerAccountFromRow(linkedRows[0])
  }

  const rows = (await sql`
    select * from provider_accounts
    where client_id = ${device.client_id}
      and (${device.server_id}::uuid is null or server_id = ${device.server_id})
    order by created_at desc
    limit 1
  `) as unknown as ProviderAccountRow[]
  const account = rows[0]
  if (!account) return null
  return providerAccountFromRow(account)
}

export async function findProviderAccountByIdForDevice(device: DeviceRow, accountId?: string | null): Promise<ProviderAccount | null> {
  if (!accountId || !device.client_id || !isDatabaseConfigured) return findProviderAccountForDevice(device)
  await ensureProviderAccountLinkSchema()
  const rows = (await sql`
    select * from provider_accounts
    where id = ${accountId}
      and client_id = ${device.client_id}
    limit 1
  `) as unknown as ProviderAccountRow[]
  return rows[0] ? providerAccountFromRow(rows[0]) : null
}

export async function findActiveProviderAccount(device: DeviceRow): Promise<ProviderAccount | null> {
  const account = await findProviderAccountForDevice(device)
  if (!account || account.status !== 'active') return null
  return account
}

export async function getProviderServerForAccount(account: ProviderAccount) {
  if (account.server_id) {
    const server = await getProviderServerById(account.server_id)
    if (server?.base_url) return server
    throw new Error('provider_server_missing')
  }
  return getDefaultServer()
}

export async function issueDeviceTokens(device: DeviceRow) {
  const access_token = issueAccessToken({ device_id: device.id, device_key: device.device_key, client_id: device.client_id })
  const refresh_token = issueRefreshToken({ device_id: device.id, device_key: device.device_key })
  const expires_at = accessTokenExpiresAt()
  if (isDatabaseConfigured) {
    await sql`
      insert into device_tokens (device_id, refresh_hash, expires_at)
      values (${device.id}, ${hashToken(refresh_token)}, ${refreshTokenExpiresAt()})
    `
    await sql`update tv_devices set token_hash = ${hashToken(access_token)}, last_seen_at = now() where id = ${device.id}`
  }
  return { access_token, refresh_token, expires_at }
}

export async function refreshDeviceTokens(deviceKey: string, refreshToken: string) {
  const claims = verifyRefreshToken(refreshToken)
  if (!claims || normalizeDeviceKey(deviceKey) !== claims.device_key) return null
  const device = await getDeviceByKey(deviceKey)
  if (!device || device.id !== claims.device_id || device.status !== 'active') return null
  if (isDatabaseConfigured) {
    const rows = (await sql`
      select id from device_tokens
      where device_id = ${device.id}
        and refresh_hash = ${hashToken(refreshToken)}
        and revoked = false
        and expires_at > now()
      limit 1
    `) as unknown as { id: string }[]
    if (!rows[0]) return null
    await sql`update device_tokens set revoked = true where id = ${rows[0].id}`
  }
  return issueDeviceTokens(device)
}

export async function requireActiveDevice(req: Request): Promise<DeviceRow | Response> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  const claims = token ? verifyAccessToken(token) : null
  const fallbackKey = new URL(req.url).searchParams.get('device_key')
  const device = claims ? await getDeviceByKey(claims.device_key) : fallbackKey ? await getDeviceByKey(fallbackKey) : null
  if (!device) return apiError('unauthorized', 'Aparelho não autenticado.', 401)
  if (device.status !== 'active') return apiError('device_not_active', 'Aparelho não está ativo.', 403)
  if (device.expires_at && new Date(device.expires_at).getTime() < Date.now()) return apiError('device_expired', 'Acesso expirado.', 403)
  return device
}

async function callYellowBox(input: { deviceKey: string; clientName: string; plan: string; days: number }) {
  const url = process.env.YELLOWBOX_API_URL || process.env.YELLOW_BOX_API_URL || process.env.YELLOW_BOX_FULL_API_URL
  if (!url) return null
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.YELLOW_BOX_API_KEY ? { authorization: `Bearer ${process.env.YELLOW_BOX_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      source: 'centralplayplus-tv',
      device_key: input.deviceKey,
      client_name: input.clientName,
      plan: input.plan,
      days: input.days,
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new ActivationProviderError('yellow_api_failed', `Yellow Box HTTP ${response.status}`)
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function accountFromYellow(parsed: YellowActivationParsed, fallback: ProviderAccount): ProviderAccount {
  const username = parsed.username || fallback.username || ''
  const password = parsed.password || fallback.password || ''
  return {
    account_id: username || fallback.account_id,
    username,
    password,
    expires_at: parsed.expiresAt || fallback.expires_at,
    max_connections: fallback.max_connections || 1,
    status: 'active',
  }
}

function assertYellowProvisioning(parsed: YellowActivationParsed) {
  if (!parsed.username) throw new ActivationProviderError('provider_validation_failed', 'Username Xtream ausente no retorno Yellow.')
  if (!parsed.password) throw new ActivationProviderError('provider_validation_failed', 'Password Xtream ausente no retorno Yellow.')
  if (!parsed.xtreamBaseUrl) throw new ActivationProviderError('provider_validation_failed', 'DNS Xtream ausente no retorno Yellow.')
}

async function looksPlayable(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        range: 'bytes=0-255',
        'user-agent': 'CentralPlayPlusTV/1.3 ActivationCheck',
        accept: '*/*',
      },
    })
    const contentType = response.headers.get('content-type')?.toLowerCase() || ''
    if (response.ok && /video|mpegurl|mp2t|octet-stream/.test(contentType)) return true
    let head = ''
    const reader = response.body?.getReader()
    if (reader) {
      const first = await reader.read()
      if (first.value) head = Buffer.from(first.value).toString('utf8', 0, 256)
      await reader.cancel().catch(() => {})
    }
    const looksHtml = /<html|<!doctype|xtream codes|not found|forbidden|unauthorized/i.test(head)
    return response.ok && !looksHtml
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function activationValidationResult(input: Partial<FreshXtreamActivationValidation> & { safeReason?: string }): FreshXtreamActivationValidation {
  return {
    ok: false,
    playerApiStatus: 0,
    liveStreamsCount: 0,
    playbackSampleOk: 0,
    playbackSampleTotal: 0,
    ...input,
  }
}

async function fetchXtreamJson<T>(input: {
  baseUrl: string
  username: string
  password: string
  action?: string
}): Promise<{ status: number; json: T | null }> {
  const url = new URL(`${input.baseUrl}/player_api.php`)
  url.searchParams.set('username', input.username)
  url.searchParams.set('password', input.password)
  if (input.action) url.searchParams.set('action', input.action)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number(process.env.XTREAM_TIMEOUT_MS || 15_000))
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'CentralPlayPlusTV/1.3 ActivationCheck',
      },
    })
    const text = await response.text()
    if (!response.ok) return { status: response.status, json: null }
    try {
      return { status: response.status, json: JSON.parse(text) as T }
    } catch {
      return { status: response.status, json: null }
    }
  } finally {
    clearTimeout(timeout)
  }
}

function safePlayerApiReason(status: number) {
  return status ? `xtream_player_api_${status}` : 'xtream_player_api_failed'
}

export async function validateFreshXtreamAccountForActivation(input: {
  baseUrl: string
  username: string
  password: string
}): Promise<FreshXtreamActivationValidation> {
  const baseUrl = normalizeXtreamBaseUrl(input.baseUrl)
  if (!baseUrl || !input.username || !input.password) {
    return activationValidationResult({ safeReason: 'yellow_parse_failed' })
  }

  const playerApi = await fetchXtreamJson<unknown>({
    baseUrl,
    username: input.username,
    password: input.password,
  }).catch(() => ({ status: 0, json: null }))
  if (playerApi.status !== 200 || !playerApi.json || typeof playerApi.json !== 'object') {
    return activationValidationResult({ playerApiStatus: playerApi.status, safeReason: safePlayerApiReason(playerApi.status) })
  }
  const userInfo = (playerApi.json as { user_info?: { status?: string; exp_date?: string | number | null } }).user_info || {}
  const accountStatus = normalizeProviderStatus(userInfo.status, userInfo.exp_date)
  const accountExpiresAt = unixExpiryToIso(userInfo.exp_date)
  if (accountStatus !== 'active') {
    return activationValidationResult({
      playerApiStatus: playerApi.status,
      accountStatus,
      accountExpiresAt,
      safeReason: accountStatus === 'expired' ? 'provider_account_expired' : 'provider_account_not_active',
    })
  }

  const [liveStreamsResponse, vodStreamsResponse, seriesResponse] = await Promise.all([
    fetchXtreamJson<unknown[]>({ baseUrl, username: input.username, password: input.password, action: 'get_live_streams' }).catch(() => ({ status: 0, json: null })),
    fetchXtreamJson<unknown[]>({ baseUrl, username: input.username, password: input.password, action: 'get_vod_streams' }).catch(() => ({ status: 0, json: null })),
    fetchXtreamJson<unknown[]>({ baseUrl, username: input.username, password: input.password, action: 'get_series' }).catch(() => ({ status: 0, json: null })),
  ])

  const liveStreamsRaw = Array.isArray(liveStreamsResponse.json) ? liveStreamsResponse.json : []
  const vodStreams = Array.isArray(vodStreamsResponse.json) ? vodStreamsResponse.json : []
  const series = Array.isArray(seriesResponse.json) ? seriesResponse.json : []
  if (liveStreamsResponse.status !== 200 || !Array.isArray(liveStreamsResponse.json)) {
    return activationValidationResult({
      playerApiStatus: playerApi.status,
      vodStreamsCount: vodStreams.length,
      seriesCount: series.length,
      safeReason: liveStreamsResponse.status ? `xtream_live_streams_${liveStreamsResponse.status}` : 'xtream_live_streams_failed',
    })
  }

  const sample = liveStreamsRaw
    .map((item) => String((item as { stream_id?: string | number }).stream_id || '').trim())
    .filter(Boolean)
    .slice(0, 5)
  if (!sample.length) {
    return activationValidationResult({
      playerApiStatus: playerApi.status,
      liveStreamsCount: liveStreamsRaw.length,
      vodStreamsCount: vodStreams.length,
      seriesCount: series.length,
      safeReason: 'xtream_live_streams_empty',
    })
  }

  const account: ProviderAccount = {
    account_id: input.username,
    username: input.username,
    password: input.password,
    expires_at: null,
    max_connections: 1,
    status: 'active',
  }
  const adapter = getProviderAdapter({
    server_id: 'activation-validation',
    kind: 'xtream',
    base_url: baseUrl,
    username: input.username,
    password: input.password,
  })

  let playbackSampleOk = 0
  for (const providerRef of sample) {
    const raw = await adapter.getStreamUrl({ account, provider_ref: providerRef, type: 'live' })
    if (await looksPlayable(raw.url)) playbackSampleOk++
  }

  const result = activationValidationResult({
    ok: playbackSampleOk > 0,
    playerApiStatus: playerApi.status,
    liveStreamsCount: liveStreamsRaw.length,
    vodStreamsCount: vodStreams.length,
    seriesCount: series.length,
    playbackSampleOk,
    playbackSampleTotal: sample.length,
    accountStatus,
    accountExpiresAt,
    safeReason: playbackSampleOk > 0 ? undefined : 'playback_sample_failed',
  })
  return result
}

function unixExpiryToIso(value?: string | number | null) {
  const timestamp = Number(value || 0)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  return new Date(timestamp * 1000).toISOString()
}

function normalizeProviderStatus(status?: string, expDate?: string | number | null): ProviderAccount['status'] {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('disabled') || normalized.includes('banned') || normalized.includes('blocked')) return 'blocked'
  const expiresAt = unixExpiryToIso(expDate)
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired'
  return 'active'
}

async function validateProviderBeforeActivation(server: ProviderServerLike, account: ProviderAccount) {
  const result = await validateFreshXtreamAccountForActivation({
    baseUrl: server.base_url,
    username: account.username,
    password: account.password,
  })
  if (!result.ok) {
    throw new ActivationProviderError(result.safeReason || 'provider_validation_failed', 'Provider Xtream falhou na validacao segura de ativacao.')
  }
  return result
}

async function validateYellowCandidatesBeforeActivation(input: {
  baseUrls: string[]
  username: string
  password: string
}): Promise<{ baseUrl: string; validation: FreshXtreamActivationValidation }> {
  const baseUrls = Array.from(new Set(input.baseUrls.map(normalizeXtreamBaseUrl).filter(Boolean))).slice(0, 8)
  let last: FreshXtreamActivationValidation | null = null
  const retryDelaysMs = [0, 1500, 3500, 7000]
  for (const delay of retryDelaysMs) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    for (const baseUrl of baseUrls) {
      const validation = await validateFreshXtreamAccountForActivation({
        baseUrl,
        username: input.username,
        password: input.password,
      })
      if (validation.ok) return { baseUrl, validation }
      last = validation
    }
  }

  const safeReason = last?.safeReason || 'yellow_parse_failed'
  throw new ActivationProviderError(safeReason, 'Nenhuma base Xtream Yellow validou com player_api/playback.')
}

function yellowBoxPlaceholderServer(id = 'yellowbox') {
  return {
    id,
    name: 'Yellow Box',
    kind: 'xtream',
    base_url: '',
    username: null,
    password: null,
    api_key: null,
    m3u_url: null,
  } as const
}

async function getOrCreateYellowBoxServer() {
  if (!isDatabaseConfigured) return yellowBoxPlaceholderServer()

  const existing = (await sql`
    select id, name, kind, base_url, username, password, api_key, m3u_url
    from provider_servers
    where name = 'Yellow Box'
      and kind = 'xtream'
    order by created_at asc
    limit 1
  `) as unknown as any[]

  if (existing[0]) return existing[0]

  const inserted = (await sql`
    insert into provider_servers (name, kind, base_url, status)
    values ('Yellow Box', 'xtream', ${normalizeXtreamBaseUrl(process.env.YELLOW_BOX_XTREAM_URL) || ''}, 'active')
    returning id, name, kind, base_url, username, password, api_key, m3u_url
  `) as unknown as any[]

  return inserted[0]
}

export async function activateDevice(input: {
  device_key: string
  client_id?: string
  client_name?: string
  plan_ref?: string
  plan?: string
  server_id?: string
  provider_account_id?: string
  days?: number
}) {
  await ensureProviderAccountLinkSchema()
  const device = await getDeviceByKey(input.device_key)
  if (!device) throw new Error('Device Key não encontrada.')
  const plan = input.plan_ref || input.plan || 'Mensal'
  const days = planDays(plan, input.days)
  const expiresAt = addDaysIso(days)
  const server = process.env.YELLOW_BOX_FULL_API_URL
    ? await getOrCreateYellowBoxServer()
    : await getDefaultServer()
  const credentials = credentialsFromServer(server)
  const fallbackAccount = providerAccountFromCredentials(credentials, {
    expires_at: expiresAt,
    max_connections: 1,
    status: 'active',
  })
  const clientName = input.client_name || (input as any).clientName || input.client_id || process.env.DEFAULT_YELLOWBOX_CLIENT || "Arthur";
  const yellow = await callYellowBox({ deviceKey: device.device_key, clientName, plan, days })
  const parsedYellow = parseYellowActivationResponse(yellow)
  if (process.env.YELLOWBOX_API_URL || process.env.YELLOW_BOX_API_URL || process.env.YELLOW_BOX_FULL_API_URL) {
    assertYellowProvisioning(parsedYellow)
  }
  const providerAccount = accountFromYellow(parsedYellow, fallbackAccount)
  const yellowBaseCandidates = [
    parsedYellow.xtreamBaseUrl,
    ...extractYellowXtreamBaseCandidates(yellow),
  ].filter(Boolean)
  const selectedYellow = await validateYellowCandidatesBeforeActivation({
    baseUrls: yellowBaseCandidates,
    username: providerAccount.username,
    password: providerAccount.password,
  })
  const yellowBaseUrl = selectedYellow.baseUrl
  const providerExpiresAt = selectedYellow.validation.accountExpiresAt && new Date(selectedYellow.validation.accountExpiresAt).getTime() > Date.now()
    ? selectedYellow.validation.accountExpiresAt
    : expiresAt
  providerAccount.server_id = server.id

  if (!isDatabaseConfigured) {
    const next = { ...device, status: 'active' as DeviceStatus, server_id: server.id, activated_at: new Date().toISOString(), expires_at: expiresAt }
    memoryDevices.set(device.device_key, next)
    return next
  }

  const clientRows = input.client_id
    ? (await sql`select id from clients where id = ${input.client_id}::uuid limit 1`) as unknown as { id: string }[]
    : []
  const clientId = clientRows[0]?.id || ((await sql`
    insert into clients (name, note)
    values (${clientName}, ${`Ativado via Device Key ${device.device_key}`})
    returning id
  `) as unknown as { id: string }[])[0].id

  await sql`
    update provider_servers
    set base_url = ${yellowBaseUrl},
        username = ${providerAccount.username},
        password = ${providerAccount.password},
        m3u_url = ${parsedYellow.m3uUrl || parsedYellow.hlsUrl || null}
    where id = ${server.id}
      and ${yellowBaseUrl} <> ''
  `

  const insertedAccounts = (await sql`
    insert into provider_accounts (client_id, server_id, account_ref, username, password, max_conns, status, expires_at)
    values (${clientId}, ${server.id}, ${providerAccount.account_id}, ${providerAccount.username}, ${providerAccount.password}, ${providerAccount.max_connections}, 'active', ${providerExpiresAt})
    returning id
  `) as unknown as { id: string }[]
  const providerAccountId = insertedAccounts[0]?.id || null
  const rows = (await sql`
    update tv_devices
    set client_id = ${clientId},
        server_id = ${server.id},
        provider_account_id = ${providerAccountId},
        status = 'active',
        activated_at = now(),
        expires_at = ${expiresAt}
    where device_key = ${device.device_key}
    returning *
  `) as unknown as DeviceRow[]
  return rows[0]
}

export async function renewDevice(deviceKey: string, days = 30) {
  const device = await getDeviceByKey(deviceKey)
  if (!device) throw new Error('Device Key não encontrada.')
  const base = Math.max(device.expires_at ? new Date(device.expires_at).getTime() : 0, Date.now())
  const expiresAt = new Date(base + days * 86400_000).toISOString()
  if (isDatabaseConfigured) {
    const rows = (await sql`update tv_devices set status = 'active', expires_at = ${expiresAt} where id = ${device.id} returning *`) as unknown as DeviceRow[]
    return rows[0]
  }
  const next = { ...device, status: 'active' as DeviceStatus, expires_at: expiresAt }
  memoryDevices.set(device.device_key, next)
  return next
}

export async function setDeviceBlocked(deviceKey: string, blocked: boolean) {
  const device = await getDeviceByKey(deviceKey)
  if (!device) throw new Error('Device Key não encontrada.')
  const status: DeviceStatus = blocked ? 'blocked' : 'active'
  if (isDatabaseConfigured) {
    const rows = (await sql`update tv_devices set status = ${status} where id = ${device.id} returning *`) as unknown as DeviceRow[]
    return rows[0]
  }
  const next = { ...device, status }
  memoryDevices.set(device.device_key, next)
  return next
}

export async function updateHeartbeat(device: DeviceRow, channelId?: string | null) {
  if (isDatabaseConfigured) {
    await sql`update tv_devices set last_seen_at = now() where id = ${device.id}`
    await sql`
      insert into tv_sessions (device_id, client_id, current_channel_id, ip_address, status)
      values (${device.id}, ${device.client_id}, ${channelId || null}, null, 'online')
      on conflict do nothing
    `
  }
}
