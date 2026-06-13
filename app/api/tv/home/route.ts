/**
 * GET /api/tv/home
 * Blocos prontos para a tela inicial (catálogo normalizado + cache).
 * Backend implementado pelo Codex.
 */
import { json } from '@/lib/api/helpers'
import type { HomeResponse } from '@/lib/types/tv'

export async function GET(_req: Request) {
  // TODO(Codex):
  // 1. Validar token do aparelho (getDeviceToken) e plano do cliente.
  // 2. Montar rows a partir do catálogo normalizado em cache (Redis).
  // 3. Versionar com catalog_version para a TV saber quando recarregar.
  const res: HomeResponse = { rows: [], catalog_version: '0' }
  return json(res)
}
