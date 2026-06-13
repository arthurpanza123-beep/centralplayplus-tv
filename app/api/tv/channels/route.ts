/**
 * GET /api/tv/channels?category=...&page=...
 * Lista de canais normalizados (paginada). NUNCA inclui provider_ref.
 * Backend implementado pelo Codex.
 */
import { json } from '@/lib/api/helpers'
import type { Channel } from '@/lib/types/tv'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const _category = searchParams.get('category')
  const _page = Number(searchParams.get('page') ?? '1')

  // TODO(Codex):
  // 1. Validar token do aparelho.
  // 2. Buscar canais do catálogo normalizado (cache/DB), paginado.
  // 3. Expor apenas variantes públicas (id + quality), sem provider_ref.
  const res: { items: Channel[]; page: number; has_more: boolean } = {
    items: [],
    page: _page,
    has_more: false,
  }
  return json(res)
}
