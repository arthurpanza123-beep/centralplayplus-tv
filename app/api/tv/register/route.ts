/**
 * POST /api/tv/register
 * Registra um aparelho novo e gera a Device Key (status: pending).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
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

  // TODO(Codex):
  // 1. Verificar se já existe device para este install_id (idempotência).
  // 2. Gerar device_key única (ex: "CP-482913") e gravar em tv_devices (status=pending).
  // 3. Registrar evento device_registrado.
  const res: RegisterDeviceResponse = {
    device_key: 'CP-000000', // stub
    status: 'pending',
    poll_interval_seconds: 5,
  }
  return json(res, { status: 201 })
}
