import { apiError, isAdmin, json } from '@/lib/api/helpers'
import { credentialsFromServer, getCatalog, getDefaultServer, loadChannelVariants } from '@/lib/catalog/service'
import { isDatabaseConfigured, sql } from '@/lib/db/client'
import { notifyIncident } from '@/lib/notifications/evolution'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
import type { ProviderAccount } from '@/lib/providers/types'

async function getHealthAccount(): Promise<ProviderAccount | null> {
  if (!isDatabaseConfigured) return null
  const rows = (await sql`
    select account_ref, username, password, max_conns, status, expires_at
    from provider_accounts
    where status = 'active'
    order by created_at desc
    limit 1
  `) as unknown as Array<{
    account_ref: string
    username: string
    password: string
    max_conns: number
    status: ProviderAccount['status']
    expires_at: string | null
  }>
  const account = rows[0]
  if (!account) return null
  return {
    account_id: account.account_ref,
    username: account.username,
    password: account.password,
    max_connections: account.max_conns,
    status: account.status,
    expires_at: account.expires_at,
  }
}

async function looksPlayable(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { range: 'bytes=0-255', accept: '*/*', 'user-agent': 'CentralPlayPlusTV/1.3 HealthCheck' },
    })
    let head = ''
    const reader = response.body?.getReader()
    if (reader) {
      const first = await reader.read()
      if (first.value) head = Buffer.from(first.value).toString('utf8', 0, 256)
      await reader.cancel().catch(() => {})
    }
    return response.ok && !/<html|<!doctype|not found|forbidden|unauthorized|error/i.test(head)
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado.', 401)

  const sampleSize = Math.max(3, Math.min(Number(new URL(req.url).searchParams.get('sample') || 20), 50))
  try {
    const server = await getDefaultServer()
    const account = await getHealthAccount()
    if (!account) return apiError('provider_account_missing', 'Conta ativa do provider não encontrada.', 503)
    const adapter = getProviderAdapter(credentialsFromServer({ ...server, username: account.username, password: account.password }))

    const [status, catalog] = await Promise.all([
      adapter.getUserStatus(account.account_id),
      getCatalog(),
    ])
    const channels = catalog.channels.slice(0, sampleSize)
    let ok = 0
    const failures: string[] = []
    for (const channel of channels) {
      const variant = (await loadChannelVariants(channel.id))[0]
      if (!variant) {
        failures.push(channel.name)
        continue
      }
      const raw = await adapter.getStreamUrl({ account, provider_ref: variant.providerRef, type: 'live' })
      if (await looksPlayable(raw.url)) ok++
      else failures.push(channel.name)
    }
    const total = channels.length
    const ratio = total ? ok / total : 0

    if (status.status !== 'active' || ratio < 0.7) {
      await notifyIncident({
        key: `health:playback:${status.status}:${ok}:${total}`,
        title: 'Instabilidade geral Xtream',
        severity: ratio < 0.4 ? 'critical' : 'warning',
        message: [
          'Alerta Central Play Plus',
          '',
          'Xtream com instabilidade geral.',
          `player_api: ${status.status === 'active' ? '200' : 'falha'}`,
          `Playback OK: ${ok}/${total}`,
          `Falhas: ${Math.max(total - ok, 0)}`,
          `Principal erro: ${status.status === 'active' ? 'playback indisponível' : 'player_api/provider'}`,
          '',
          'Verificar provedor.',
        ].join('\n'),
        cooldownMinutes: 30,
      })
    }

    return json({
      ok: status.status === 'active' && ratio >= 0.7,
      player_api: status.status === 'active' ? 'ok' : status.status,
      playback_ok: ok,
      playback_total: total,
      failed_count: failures.length,
      counts: catalog.counts,
    })
  } catch (error) {
    await notifyIncident({
      key: 'health:provider_api_failed',
      title: 'Provider Xtream indisponível',
      severity: 'critical',
      message: [
        'Alerta Central Play Plus',
        '',
        'Provider Xtream não respondeu corretamente.',
        'Principal erro: player_api/provider',
        '',
        'Verificar provedor.',
      ].join('\n'),
      cooldownMinutes: 30,
    })
    return apiError('health_failed', error instanceof Error ? error.message : 'Falha no health check.', 500)
  }
}
