/**
 * POST /api/admin/device/activate
 * Operador ativa um aparelho pendente, vincula cliente/plano/fornecedor.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'

interface ActivateBody {
  device_key: string
  client_id: string
  plan_ref: string
  server_id: string
  provider_account_id?: string // vincular acesso existente (opcional)
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: ActivateBody
  try {
    body = (await req.json()) as ActivateBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.client_id) {
    return apiError('missing_fields', 'device_key e client_id são obrigatórios', 422)
  }

  // TODO(Codex):
  // 1. Vincular device_key ao client_id (tv_devices).
  // 2. Se provider_account_id ausente -> criar conta via Provider Adapter.createUser().
  // 3. Definir status=active e expires_at conforme o plano.
  // 4. Registrar evento device_ativado.
  return json({ ok: true, status: 'active' })
}
