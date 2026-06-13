/**
 * POST /api/admin/device/block  { device_key, blocked: boolean }
 * Bloqueia ou desbloqueia um aparelho.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'

interface BlockBody {
  device_key: string
  blocked: boolean
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: BlockBody
  try {
    body = (await req.json()) as BlockBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || typeof body.blocked !== 'boolean') {
    return apiError('missing_fields', 'device_key e blocked são obrigatórios', 422)
  }

  // TODO(Codex):
  // 1. Atualizar tv_devices.status (blocked/active).
  // 2. Opcional: bloquear/desbloquear conta no fornecedor (Provider Adapter).
  // 3. Forçar logout das sessões ativas no próximo heartbeat.
  return json({ ok: true, status: body.blocked ? 'blocked' : 'active' })
}
