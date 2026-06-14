/**
 * POST /api/tv/register
 * Registra um aparelho novo e gera a Device Key (status: pending).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { registerDevice } from '@/lib/devices/service'
import type { RegisterDeviceRequest, RegisterDeviceResponse } from '@/lib/types/tv'

export async function POST(req: Request) {
  let body: RegisterDeviceRequest
  try {
    body = (await req.json()) as RegisterDeviceRequest
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }

  if (!body?.platform || !body?.install_id) {
    return apiError('missing_fields', 'platform e install_id são obrigatórios', 422)
  }

  try {
    const device = await registerDevice(body)
    const res: RegisterDeviceResponse = {
      device_key: device.device_key,
      status: device.status,
      poll_interval_seconds: Number(process.env.TV_POLL_INTERVAL_SECONDS || 5),
    }
    return json(res, { status: 201 })
  } catch (error) {
    return apiError('register_failed', error instanceof Error ? error.message : 'Falha ao registrar aparelho.', 500)
  }
}
