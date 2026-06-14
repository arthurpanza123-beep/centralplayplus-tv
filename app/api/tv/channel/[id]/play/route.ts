/**
 * GET /api/tv/channel/:id/play
 * Decide a MELHOR rota (maior health_score) e devolve fallbacks.
 * Os links são temporários/proxados — validade curta.
 * Backend implementado pelo Codex.
 */
import { apiError, json } from '@/lib/api/helpers'
import { credentialsFromServer, getDefaultServer, loadChannelVariants } from '@/lib/catalog/service'
import { findActiveProviderAccount, requireActiveDevice } from '@/lib/devices/service'
import { issueStreamToken } from '@/lib/security/tokens'
import { rankVariants } from '@/lib/streaming/variant-health'
import type { ChannelPlayResponse, ContentType } from '@/lib/types/tv'

// ChannelPlayResponse documenta o formato de resposta esperado (ver abaixo).
export type { ChannelPlayResponse }

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return apiError('missing_channel_id', 'id do canal ausente', 422)

  const device = await requireActiveDevice(req)
  if (device instanceof Response) return device

  try {
    const variants = await loadChannelVariants(id)
    const { primary, fallbacks } = rankVariants(variants)
    if (!primary) return apiError('no_stream_variant', 'Nenhuma rota de stream disponível para este canal.', 404)

    const server = await getDefaultServer()
    const account = await findActiveProviderAccount(device)
    if (!account) return apiError('provider_account_missing', 'Conta do fornecedor não vinculada ao aparelho.', 403)
    const base = process.env.PUBLIC_API_BASE_URL || new URL(req.url).origin
    const streamUrl = (variant: typeof primary) => {
      const token = issueStreamToken({
        device_id: device.id,
        device_key: device.device_key,
        channel_id: id,
        variant_id: variant.id,
        provider_ref: variant.providerRef,
        type: 'live' as ContentType,
      })
      return `${base}/api/tv/stream/${encodeURIComponent(token)}`
    }

    void credentialsFromServer(server)
    const res: ChannelPlayResponse = {
      channel_id: id,
      selected_variant: { id: primary.id, quality: primary.quality, stream_url: streamUrl(primary) },
      fallback_variants: fallbacks.map((variant) => ({ id: variant.id, quality: variant.quality, stream_url: streamUrl(variant) })),
      max_start_time_ms: Number(process.env.TV_MAX_START_TIME_MS || 8000),
    }
    return json(res)
  } catch (error) {
    return apiError('play_failed', error instanceof Error ? error.message : 'Falha ao iniciar reprodução.', 500)
  }
}
