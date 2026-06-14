/**
 * POST /api/admin/device/renew  { device_key, months }
 * Renova o acesso do aparelho/cliente.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'
import { renewDevice } from '@/lib/devices/service'

interface RenewBody {
  device_key: string
  months?: number
  days?: number
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: RenewBody
  try {
    body = (await req.json()) as RenewBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || (!body?.months && !body?.days)) {
    return apiError('missing_fields', 'device_key e months/days são obrigatórios', 422)
  }

  try {
    const device = await renewDevice(body.device_key, body.days || (body.months || 1) * 30)
    return json({ ok: true, expires_at: device.expires_at, status: device.status })
  } catch (error) {
    return apiError('renew_failed', error instanceof Error ? error.message : 'Falha ao renovar dispositivo.', 500)
  }
}
