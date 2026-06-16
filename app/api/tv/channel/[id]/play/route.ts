/**
 * GET /api/tv/channel/:id/play
 * Decide a MELHOR rota (maior health_score) e devolve fallbacks.
 * Os links são temporários/proxados — validade curta.
 * Backend implementado pelo Codex.
 */
import { apiError, json } from '@/lib/api/helpers'
import { credentialsFromServer, getCatalog, getDefaultServer, loadChannelVariants } from '@/lib/catalog/service'
import { findActiveProviderAccount, requireActiveDevice } from '@/lib/devices/service'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
import { issueStreamToken } from '@/lib/security/tokens'
import { rankVariants } from '@/lib/streaming/variant-health'
import type { ChannelPlayResponse, ContentType } from '@/lib/types/tv'

// ChannelPlayResponse documenta o formato de resposta esperado (ver abaixo).
export type { ChannelPlayResponse }

type StreamFormat = 'hls' | 'ts' | 'mp4' | 'unknown'

async function probeStream(url: string): Promise<{ ok: boolean; mimeType?: string; format: StreamFormat; status?: number }> {
  const lower = url.toLowerCase()
  const timeout = AbortSignal.timeout(7000)
  let response: Response | null = null
  let head = ''
  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: timeout,
      headers: {
        range: 'bytes=0-255',
        'user-agent': 'CentralPlayPlusTV/1.0 AndroidTV',
        accept: '*/*',
      },
    })
    const reader = response.body?.getReader()
    if (reader) {
      const first = await reader.read()
      if (first.value) head = Buffer.from(first.value).toString('utf8', 0, 256)
      await reader.cancel().catch(() => {})
    }
  } catch {
    return { ok: false, format: formatFromUrl(lower) }
  }
  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  const looksHls = head.trimStart().startsWith('#EXTM3U')
  const looksHtml = /<html|<!doctype|xtream codes|not found|forbidden|unauthorized|error/i.test(head)
  const format = looksHls || contentType.includes('mpegurl') || lower.includes('.m3u8')
    ? 'hls'
    : contentType.includes('mp2t') || lower.includes('.ts')
      ? 'ts'
      : contentType.includes('mp4') || lower.includes('.mp4')
        ? 'mp4'
        : formatFromUrl(lower)
  const mimeType = format === 'hls' ? 'application/x-mpegURL' : format === 'ts' ? 'video/mp2t' : format === 'mp4' ? 'video/mp4' : undefined
  return { ok: response.ok && !looksHtml, mimeType, format, status: response.status }
}

function formatFromUrl(lowerUrl: string): StreamFormat {
  if (lowerUrl.includes('.m3u8')) return 'hls'
  if (lowerUrl.includes('.ts')) return 'ts'
  if (lowerUrl.includes('.mp4')) return 'mp4'
  return 'unknown'
}

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
    const catalog = await getCatalog()
    const channel = catalog.channels.find((item) => item.id === id)
    const base = process.env.PUBLIC_API_BASE_URL || new URL(req.url).origin
    const adapter = getProviderAdapter(credentialsFromServer(server))
    const candidates = [primary, ...fallbacks]
    let selected = primary
    let streamInfo: Awaited<ReturnType<typeof probeStream>> = { ok: true, mimeType: undefined, format: 'unknown' }
    for (const variant of candidates) {
      const raw = await adapter.getStreamUrl({ account, provider_ref: variant.providerRef, type: 'live' })
      const probe = await probeStream(raw.url)
      if (probe.ok) {
        selected = variant
        streamInfo = probe
        break
      }
      streamInfo = probe
    }
    if (!streamInfo.ok) return apiError('stream_upstream_unavailable', 'Stream indisponível no fornecedor.', 502)

    const streamUrl = (variant: typeof primary) => {
      const token = issueStreamToken({
        device_id: device.id,
        device_key: device.device_key,
        channel_id: id,
        variant_id: variant.id,
        provider_ref: variant.providerRef,
        type: 'live',
      })
      return `${base}/api/tv/stream/${encodeURIComponent(token)}`
    }

    const res: ChannelPlayResponse = {
      ok: true,
      type: 'live' as ContentType,
      title: channel?.name || 'Canal',
      playback_url: streamUrl(selected),
      mime_type: streamInfo.mimeType,
      stream_format: streamInfo.format,
      channel_id: id,
      selected_variant: { id: selected.id, quality: selected.quality, stream_url: streamUrl(selected) },
      fallback_variants: candidates.filter((variant) => variant.id !== selected.id).map((variant) => ({ id: variant.id, quality: variant.quality, stream_url: streamUrl(variant) })),
      max_start_time_ms: Number(process.env.TV_MAX_START_TIME_MS || 8000),
    }
    return json(res)
  } catch (error) {
    return apiError('play_failed', error instanceof Error ? error.message : 'Falha ao iniciar reprodução.', 500)
  }
}
