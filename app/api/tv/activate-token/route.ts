/**
 * POST /api/tv/activate-token
 * Troca o refresh_token por um novo access_token (renovação de sessão).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { refreshDeviceTokens } from '@/lib/devices/service'
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

  try {
    const tokens = await refreshDeviceTokens(body.device_key, body.refresh_token)
    if (!tokens) return apiError('invalid_refresh_token', 'Refresh token inválido ou expirado.', 401)
    const res: ActivateTokenResponse = tokens
    return json(res)
  } catch (error) {
    return apiError('token_refresh_failed', error instanceof Error ? error.message : 'Falha ao renovar token.', 500)
  }
}
