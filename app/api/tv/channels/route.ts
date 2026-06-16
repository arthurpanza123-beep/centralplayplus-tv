/**
 * GET /api/tv/channels?category=...&page=...
 * Lista de canais normalizados (paginada). NUNCA inclui provider_ref.
 * Backend implementado pelo Codex.
 */
import { apiError, json } from '@/lib/api/helpers'
import { getCatalog } from '@/lib/catalog/service'
import { requireActiveDevice } from '@/lib/devices/service'
import type { Channel } from '@/lib/types/tv'

export async function GET(req: Request) {
  const device = await requireActiveDevice(req)
  if (device instanceof Response) return device
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const pageSize = Math.min(Math.max(Number(searchParams.get('limit') || searchParams.get('page_size') || 80), 1), 500)

  try {
    const catalog = await getCatalog()
    const filtered = category ? catalog.channels.filter((channel) => channel.category === category || channel.id === category) : catalog.channels
    const start = (page - 1) * pageSize
    const items: Channel[] = filtered.slice(start, start + pageSize)
    return json({
      items,
      page,
      limit: pageSize,
      total: filtered.length,
      total_pages: Math.ceil(filtered.length / pageSize),
      has_more: start + pageSize < filtered.length,
      counts: catalog.counts,
    })
  } catch (error) {
    return apiError('channels_unavailable', error instanceof Error ? error.message : 'Canais indisponíveis.', 503)
  }
}
