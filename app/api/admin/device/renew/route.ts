/**
 * POST /api/admin/device/renew  { device_key, months }
 * Renova o acesso do aparelho/cliente.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'

interface RenewBody {
  device_key: string
  months: number
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: RenewBody
  try {
    body = (await req.json()) as RenewBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.months) {
    return apiError('missing_fields', 'device_key e months são obrigatórios', 422)
  }

  // TODO(Codex):
  // 1. Renovar conta no fornecedor via Provider Adapter.renewUser().
  // 2. Atualizar tv_devices.expires_at.
  return json({ ok: true })
}
