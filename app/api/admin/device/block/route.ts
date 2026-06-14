/**
 * POST /api/admin/device/block  { device_key, blocked: boolean }
 * Bloqueia ou desbloqueia um aparelho.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'
import { setDeviceBlocked } from '@/lib/devices/service'

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

  try {
    const device = await setDeviceBlocked(body.device_key, body.blocked)
    return json({ ok: true, status: device.status })
  } catch (error) {
    return apiError('block_failed', error instanceof Error ? error.message : 'Falha ao atualizar bloqueio.', 500)
  }
}
