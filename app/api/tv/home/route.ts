/**
 * GET /api/tv/home
 * Blocos prontos para a tela inicial (catálogo normalizado + cache).
 * Backend implementado pelo Codex.
 */
import { apiError, json } from '@/lib/api/helpers'
import { getHome } from '@/lib/catalog/service'
import { requireActiveDevice } from '@/lib/devices/service'
import type { HomeResponse } from '@/lib/types/tv'

export async function GET(req: Request) {
  const device = await requireActiveDevice(req)
  if (device instanceof Response) return device
  try {
    const res: HomeResponse = await getHome()
    return json(res)
  } catch (error) {
    return apiError('catalog_unavailable', error instanceof Error ? error.message : 'Catálogo indisponível.', 503)
  }
}
