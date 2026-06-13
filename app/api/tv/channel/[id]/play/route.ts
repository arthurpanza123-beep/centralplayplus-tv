/**
 * GET /api/tv/channel/:id/play
 * Decide a MELHOR rota (maior health_score) e devolve fallbacks.
 * Os links são temporários/proxados — validade curta.
 * Backend implementado pelo Codex.
 */
import { apiError } from '@/lib/api/helpers'
import type { ChannelPlayResponse } from '@/lib/types/tv'

// ChannelPlayResponse documenta o formato de resposta esperado (ver abaixo).
export type { ChannelPlayResponse }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return apiError('missing_channel_id', 'id do canal ausente', 422)

  // TODO(Codex):
  // 1. Validar token do aparelho + plano ativo + limite de telas (sessões).
  // 2. Buscar variantes do canal em channel_variants, ordenar por health_score
  //    (ignorando blacklist temporária).
  // 3. Resolver stream_url de cada variante via Provider Adapter (getStreamUrl)
  //    e PROXAR/assinar o link (não expor dados do fornecedor).
  // 4. Devolver selected_variant + fallback_variants + max_start_time_ms.
  return apiError('not_implemented', 'Reprodução ainda não implementada (Codex)', 501)

  // Exemplo do formato esperado:
  // const res: ChannelPlayResponse = {
  //   channel_id: id,
  //   selected_variant: { id: '...', quality: 'HD', stream_url: '...' },
  //   fallback_variants: [],
  //   max_start_time_ms: 8000,
  // }
  // return json(res)
}
