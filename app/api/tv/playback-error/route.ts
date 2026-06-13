/**
 * POST /api/tv/playback-error
 * A TV reporta falha de stream; a API decide trocar de rota e baixa
 * o health_score da variante ruim (e pode mandar para blacklist).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import type { PlaybackErrorRequest, PlaybackErrorResponse } from '@/lib/types/tv'

export async function POST(req: Request) {
  let body: PlaybackErrorRequest
  try {
    body = (await req.json()) as PlaybackErrorRequest
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.channel_id || !body?.variant_id || !body?.error_type) {
    return apiError('missing_fields', 'campos obrigatórios ausentes', 422)
  }

  // TODO(Codex):
  // 1. Gravar em playback_errors.
  // 2. Reduzir health_score da variante; se exceder limite -> blacklist temporária.
  // 3. Escolher a próxima variante válida (fallback) e devolvê-la.
  const res: PlaybackErrorResponse = {
    action: 'show_error',
    message: 'Não foi possível ajustar o sinal agora.',
  }
  return json(res)
}
