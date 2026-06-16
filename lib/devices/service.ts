import crypto from 'crypto'

import { apiError } from '@/lib/api/helpers'
import { getDefaultServer, credentialsFromServer, providerAccountFromCredentials } from '@/lib/catalog/service'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
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

const memoryDevices = new Map<string, DeviceRow>()
const memoryByInstall = new Map<string, string>()

export function normalizeDeviceKey(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.startsWith('CP')) return `CP-${clean.slice(2, 8)}`
  return `CP-${clean.slice(0, 6)}`
}

function generateDeviceKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `CP-${code}`
}

function addDaysIso(days: number) {
  return new Date(Date.now() + Math.max(days || 30, 1) * 86400_000).toISOString()
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
    if (existingKey) return memoryDevices.get(existingKey)!
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
  if (existing[0]) return existing[0]

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
  const rows = (await sql`select * from tv_devices where device_key = ${key} limit 1`) as unknown as DeviceRow[]
  return rows[0] || null
}

export async function findActiveProviderAccount(device: DeviceRow): Promise<ProviderAccount | null> {
  if (!device.client_id) return null
  if (!isDatabaseConfigured) {
    const server = await getDefaultServer()
    return providerAccountFromCredentials(credentialsFromServer(server))
  }
  const rows = (await sql`
    select * from provider_accounts
    where client_id = ${device.client_id}
      and (${device.server_id}::uuid is null or server_id = ${device.server_id})
      and status = 'active'
    order by created_at desc
    limit 1
  `) as unknown as ProviderAccountRow[]
  const account = rows[0]
  if (!account) return null
  return {
    account_id: account.account_ref,
    username: account.username,
    password: account.password,
    expires_at: account.expires_at,
    max_connections: account.max_conns,
    status: account.status,
  }
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
  if (!response.ok) throw new Error(`Yellow Box HTTP ${response.status}`)
  return await response.json().catch(() => null) as Record<string, unknown> | null
}

function accountFromYellow(data: Record<string, unknown> | null, fallback: ProviderAccount): ProviderAccount {
  if (!data) return fallback
  const username = String(data.username || data.user || data.login || data.xtream_username || fallback.username || '').trim()
  const password = String(data.password || data.pass || data.xtream_password || fallback.password || '').trim()
  return {
    account_id: String(data.account_id || data.order_id || username || fallback.account_id),
    username,
    password,
    expires_at: typeof data.expires_at === 'string' ? data.expires_at : fallback.expires_at,
    max_connections: Number(data.max_connections || data.max_conns || fallback.max_connections || 1),
    status: 'active',
  }
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
    values ('Yellow Box', 'xtream', '', 'active')
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
  const providerAccount = accountFromYellow(yellow, fallbackAccount)

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
    insert into provider_accounts (client_id, server_id, account_ref, username, password, max_conns, status, expires_at)
    values (${clientId}, ${server.id}, ${providerAccount.account_id}, ${providerAccount.username}, ${providerAccount.password}, ${providerAccount.max_connections}, 'active', ${providerAccount.expires_at || expiresAt})
  `
  const rows = (await sql`
    update tv_devices
    set client_id = ${clientId},
        server_id = ${server.id},
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
