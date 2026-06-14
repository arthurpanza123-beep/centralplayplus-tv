/**
 * POST /api/tv/playback-event
 * Telemetria de reprodução (first_frame, buffering, fallback, etc).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { getDeviceByKey } from '@/lib/devices/service'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import type { PlaybackEventRequest } from '@/lib/types/tv'

export async function POST(req: Request) {
  let body: PlaybackEventRequest
  try {
    body = (await req.json()) as PlaybackEventRequest
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.event) {
    return apiError('missing_fields', 'device_key e event são obrigatórios', 422)
  }

  try {
    const device = await getDeviceByKey(body.device_key)
    if (isDatabaseConfigured) {
      await sql`
        insert into playback_events (device_id, channel_id, variant_id, event, value_ms, created_at)
        values (${device?.id || null}, ${body.channel_id || null}, ${body.variant_id || null}, ${body.event}, ${body.value_ms || null}, ${body.at})
      `
      if (body.event === 'first_frame' && body.variant_id && body.value_ms) {
        await sql`
          update channel_variants
          set avg_start_time_ms = case
                when avg_start_time_ms = 0 then ${body.value_ms}
                else ((avg_start_time_ms + ${body.value_ms}) / 2)
              end,
              success_count = success_count + 1
          where id = ${body.variant_id}
        `
      }
    }
    return json({ ok: true })
  } catch (error) {
    return apiError('playback_event_failed', error instanceof Error ? error.message : 'Falha ao registrar evento.', 500)
  }
}
