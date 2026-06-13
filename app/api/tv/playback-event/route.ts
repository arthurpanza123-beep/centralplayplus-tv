/**
 * POST /api/tv/playback-event
 * Telemetria de reprodução (first_frame, buffering, fallback, etc).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
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

  // TODO(Codex):
  // 1. Gravar em playback_events (para observabilidade/painel).
  // 2. Atualizar métricas (tempo até primeiro frame, buffering) por variante.
  return json({ ok: true })
}
