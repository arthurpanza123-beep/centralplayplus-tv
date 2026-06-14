/**
 * POST /api/tv/heartbeat
 * Mantém a sessão viva, controla limite de telas e permite que o
 * servidor sinalize refresh de config/catálogo ou logout remoto.
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { requireActiveDevice, updateHeartbeat } from '@/lib/devices/service'
import { touchSession } from '@/lib/streaming/live-sessions'
import type { HeartbeatRequest, HeartbeatResponse } from '@/lib/types/tv'

export async function POST(req: Request) {
  let body: HeartbeatRequest
  try {
    body = (await req.json()) as HeartbeatRequest
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key) {
    return apiError('missing_fields', 'device_key é obrigatório', 422)
  }

  const device = await requireActiveDevice(req)
  if (device instanceof Response) return device

  try {
    await Promise.all([
      updateHeartbeat(device, body.current_channel_id),
      touchSession({
        deviceKey: device.device_key,
        platform: body.platform,
        appVersion: body.app_version,
        screen: body.current_screen,
        channelId: body.current_channel_id,
      }),
    ])
    const res: HeartbeatResponse = { ok: true }
    return json(res)
  } catch (error) {
    return apiError('heartbeat_failed', error instanceof Error ? error.message : 'Falha no heartbeat.', 500)
  }
}
