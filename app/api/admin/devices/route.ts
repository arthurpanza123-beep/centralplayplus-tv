import { apiError, isAdmin, json } from '@/lib/api/helpers'
import { isDatabaseConfigured, sql } from '@/lib/db/client'
import { listActiveSessions } from '@/lib/streaming/live-sessions'

export const runtime = 'nodejs'

type DeviceViewRow = {
  device_key: string
  client_name: string | null
  status: 'pending' | 'active' | 'blocked' | 'expired'
  plan: string | null
  provider: string | null
  platform: 'android_tv' | 'lg_webos' | 'samsung_tizen' | 'roku'
  app_version: string | null
  created_at: string
  expires_at: string | null
  last_seen_at: string | null
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  try {
    const activeSessions = await listActiveSessions()
    const online = new Set(activeSessions.map((session) => session.deviceKey))
    if (!isDatabaseConfigured) {
      return json({ devices: [], playbackErrors: [], channelHealth: [], activeSessions })
    }

    const [devices, playbackErrors, channelHealth] = await Promise.all([
      sql`
        select
          d.device_key,
          c.name as client_name,
          d.status,
          null::text as plan,
          ps.name as provider,
          d.platform,
          d.app_version,
          d.created_at,
          d.expires_at,
          d.last_seen_at
        from tv_devices d
        left join clients c on c.id = d.client_id
        left join provider_servers ps on ps.id = d.server_id
        order by d.created_at desc
        limit 500
      `.then((r) => r as unknown as DeviceViewRow[]),
      sql`
        select e.id::text, d.device_key, e.channel_id, e.variant_id, e.error_type, e.created_at
        from playback_errors e
        left join tv_devices d on d.id = e.device_id
        order by e.created_at desc
        limit 100
      `.then((r) => r as unknown as Array<{ id: string; device_key: string | null; channel_id: string | null; variant_id: string | null; error_type: string; created_at: string }>),
      sql`
        select c.name as channel_name,
               count(v.id)::int as total_variants,
               count(v.id) filter (where v.health_score >= 70 and v.status = 'active')::int as healthy_variants,
               coalesce(avg(v.health_score), 0)::int as health_score
        from channels c
        left join channel_variants v on v.channel_id = c.id
        group by c.id, c.name
        order by health_score asc, c.name asc
        limit 100
      `.then((r) => r as unknown as Array<{ channel_name: string; total_variants: number; healthy_variants: number; health_score: number }>),
    ])

    return json({
      devices: devices.map((device) => ({
        deviceKey: device.device_key,
        clientName: device.client_name,
        status: device.status,
        plan: device.plan,
        provider: device.provider || 'principal',
        platform: device.platform,
        appVersion: device.app_version || '1.0.0',
        createdAt: device.created_at,
        expiresAt: device.expires_at,
        lastSeenAt: device.last_seen_at,
        online: online.has(device.device_key),
      })),
      playbackErrors: playbackErrors.map((error) => ({
        id: error.id,
        deviceKey: error.device_key || '-',
        channelName: error.channel_id || '-',
        variantLabel: error.variant_id || '-',
        errorCode: error.error_type,
        at: error.created_at,
      })),
      channelHealth: channelHealth.map((item) => ({
        channelName: item.channel_name,
        totalVariants: item.total_variants,
        healthyVariants: item.healthy_variants,
        healthScore: item.health_score,
      })),
      activeSessions,
    })
  } catch (error) {
    return apiError('admin_devices_failed', error instanceof Error ? error.message : 'Falha ao carregar painel.', 500)
  }
}
