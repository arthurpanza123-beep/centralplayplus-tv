/**
 * GET /api/tv/categories?type=live|vod|series
 * Lista de categorias normalizadas.
 * Backend implementado pelo Codex.
 */
import { json } from '@/lib/api/helpers'
import type { Category, ContentType } from '@/lib/types/tv'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const _type = (searchParams.get('type') as ContentType | null) ?? 'live'

  // TODO(Codex): buscar categorias do catálogo normalizado (cache/DB) por tipo.
  const res: Category[] = []
  return json(res)
}
