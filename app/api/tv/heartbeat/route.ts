/**
 * POST /api/tv/heartbeat
 * Mantém a sessão viva, controla limite de telas e permite que o
 * servidor sinalize refresh de config/catálogo ou logout remoto.
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
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

  // TODO(Codex):
  // 1. Atualizar tv_sessions.last_ping_at e current_channel_id.
  // 2. Verificar limite de telas do plano (derrubar sessão antiga se exceder).
  // 3. Se device bloqueado/expirado -> force_logout=true.
  // 4. Sinalizar should_refresh_config/catalog quando houver mudança.
  const res: HeartbeatResponse = { ok: true }
  return json(res)
}
