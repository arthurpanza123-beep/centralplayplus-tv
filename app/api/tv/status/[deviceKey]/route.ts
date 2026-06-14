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

  // TODO(Codex): substituir por lógica real do banco:
  // 1. Buscar device em tv_devices pela device_key.
  // 2. Se status=pending -> { status: 'pending' } (a TV mostra "Não ativado").
  // 3. Se status=active -> emitir access/refresh token e devolver expires_at.
  // 4. Se blocked/expired -> devolver status com message amigável.
  //
  // DEMO/PREVIEW: enquanto não há banco, retornamos 'active' para o fluxo de
  // ativação funcionar de ponta a ponta no preview. Defina TV_STATUS_FORCE=pending
  // para testar visualmente o estado "Não ativado".
  const forced = process.env.TV_STATUS_FORCE as DeviceStatusResponse['status'] | undefined
  const res: DeviceStatusResponse = { status: forced ?? 'active' }
  return json(res)
}
