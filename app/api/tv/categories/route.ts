/**
 * GET /api/tv/categories?type=live|vod|series
 * Lista de categorias normalizadas.
 * Backend implementado pelo Codex.
 */
import { apiError, json } from '@/lib/api/helpers'
import { getCatalog } from '@/lib/catalog/service'
import { requireActiveDevice } from '@/lib/devices/service'
import type { Category, ContentType } from '@/lib/types/tv'

export async function GET(req: Request) {
  const device = await requireActiveDevice(req)
  if (device instanceof Response) return device
  const { searchParams } = new URL(req.url)
  const type = (searchParams.get('type') as ContentType | null) ?? 'live'

  try {
    const catalog = await getCatalog()
    const res: Category[] = catalog.categories.filter((category) => category.type === type)
    return json(res)
  } catch (error) {
    return apiError('categories_unavailable', error instanceof Error ? error.message : 'Categorias indisponíveis.', 503)
  }
}
