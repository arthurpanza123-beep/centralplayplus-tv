/**
 * POST /api/tv/activate-token
 * Troca o refresh_token por um novo access_token (renovação de sessão).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import type { ActivateTokenRequest, ActivateTokenResponse } from '@/lib/types/tv'

export async function POST(req: Request) {
  let body: ActivateTokenRequest
  try {
    body = (await req.json()) as ActivateTokenRequest
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.refresh_token) {
    return apiError('missing_fields', 'device_key e refresh_token são obrigatórios', 422)
  }

  // TODO(Codex):
  // 1. Validar refresh_token contra device_tokens (e expiração).
  // 2. Rotacionar tokens (emitir novo access + refresh) e revogar o antigo.
  // 3. Atualizar last_seen_at do device.
  const res: ActivateTokenResponse = {
    access_token: 'stub_access_token',
    refresh_token: 'stub_refresh_token',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  }
  return json(res)
}
