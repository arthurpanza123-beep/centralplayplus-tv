/**
 * POST /api/admin/device/change-provider  { device_key, server_id }
 * Move o cliente para outro servidor/fornecedor.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'
import { getDeviceByKey } from '@/lib/devices/service'
import { sql, isDatabaseConfigured } from '@/lib/db/client'

interface ChangeProviderBody {
  device_key: string
  server_id?: string
  provider?: string
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: ChangeProviderBody
  try {
    body = (await req.json()) as ChangeProviderBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || (!body?.server_id && !body?.provider)) {
    return apiError('missing_fields', 'device_key e server_id/provider são obrigatórios', 422)
  }

  try {
    const device = await getDeviceByKey(body.device_key)
    if (!device) return apiError('device_not_found', 'Device Key não encontrada.', 404)
    if (body.server_id && isDatabaseConfigured) {
      await sql`update tv_devices set server_id = ${body.server_id} where id = ${device.id}`
    }
    return json({ ok: true, provider: body.provider || body.server_id })
  } catch (error) {
    return apiError('change_provider_failed', error instanceof Error ? error.message : 'Falha ao trocar fornecedor.', 500)
  }
}
