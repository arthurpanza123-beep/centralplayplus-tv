/**
 * GET /api/tv/status/:deviceKey
 * A TV consulta em polling até o operador ativar o aparelho.
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { getDeviceByKey, issueDeviceTokens } from '@/lib/devices/service'
import type { DeviceStatusResponse } from '@/lib/types/tv'

export async function GET(_req: Request, ctx: { params: Promise<{ deviceKey: string }> }) {
  const { deviceKey } = await ctx.params
  if (!deviceKey) return apiError('missing_device_key', 'deviceKey ausente', 422)

  try {
    const device = await getDeviceByKey(deviceKey)
    if (!device) return apiError('device_not_found', 'Device Key não encontrada.', 404)
    const pendingTtlMs = Number(process.env.TV_DEVICE_KEY_TTL_MINUTES || 30) * 60_000
    if (device.status === 'pending' && Date.now() - new Date(device.created_at).getTime() > pendingTtlMs) {
      const res: DeviceStatusResponse = { status: 'expired', message: 'Código expirado. Reabra o app para gerar outro.' }
      return json(res)
    }
    if (device.expires_at && new Date(device.expires_at).getTime() < Date.now()) {
      const res: DeviceStatusResponse = { status: 'expired', message: 'Acesso expirado. Fale com o suporte.' }
      return json(res)
    }
    if (device.status === 'active') {
      const tokens = await issueDeviceTokens(device)
      const res: DeviceStatusResponse = {
        status: 'active',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
      }
      return json(res)
    }
    const res: DeviceStatusResponse = {
      status: device.status,
      message: device.status === 'blocked' ? 'Dispositivo bloqueado. Fale com o suporte.' : undefined,
    }
    return json(res)
  } catch (error) {
    return apiError('status_failed', error instanceof Error ? error.message : 'Falha ao consultar status.', 500)
  }
}
