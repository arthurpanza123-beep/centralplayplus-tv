/**
 * GET /api/tv/status/:deviceKey
 * A TV consulta em polling até o operador ativar o aparelho.
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import type { DeviceStatusResponse } from '@/lib/types/tv'

export async function GET(_req: Request, ctx: { params: Promise<{ deviceKey: string }> }) {
  const { deviceKey } = await ctx.params
  if (!deviceKey) return apiError('missing_device_key', 'deviceKey ausente', 422)

  // TODO(Codex):
  // 1. Buscar device em tv_devices pela device_key.
  // 2. Se status=pending -> { status: 'pending' }.
  // 3. Se status=active -> emitir access/refresh token e devolver expires_at.
  // 4. Se blocked/expired -> devolver status com message amigável.
  const res: DeviceStatusResponse = { status: 'pending' }
  return json(res)
}
