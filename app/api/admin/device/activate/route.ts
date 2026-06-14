/**
 * POST /api/admin/device/activate
 * Operador ativa um aparelho pendente, vincula cliente/plano/fornecedor.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'
import { activateDevice } from '@/lib/devices/service'

interface ActivateBody {
  device_key: string
  client_id?: string
  client_name?: string
  plan_ref?: string
  plan?: string
  server_id?: string
  provider_account_id?: string // vincular acesso existente (opcional)
  days?: number
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: ActivateBody
  try {
    body = (await req.json()) as ActivateBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || (!body?.client_id && !body?.client_name)) {
    return apiError('missing_fields', 'device_key e cliente são obrigatórios', 422)
  }

  try {
    const device = await activateDevice(body)
    return json({ ok: true, status: device.status, device_key: device.device_key, expires_at: device.expires_at })
  } catch (error) {
    return apiError('activation_failed', error instanceof Error ? error.message : 'Falha ao ativar dispositivo.', 500)
  }
}
