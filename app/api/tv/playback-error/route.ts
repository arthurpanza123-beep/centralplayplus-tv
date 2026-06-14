/**
 * POST /api/tv/playback-error
 * A TV reporta falha de stream; a API decide trocar de rota e baixa
 * o health_score da variante ruim (e pode mandar para blacklist).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { loadChannelVariants } from '@/lib/catalog/service'
import { getDeviceByKey } from '@/lib/devices/service'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import { degradeVariant, rankVariants } from '@/lib/streaming/variant-health'
import type { PlaybackErrorRequest, PlaybackErrorResponse } from '@/lib/types/tv'

export async function POST(req: Request) {
  let body: PlaybackErrorRequest
  try {
    body = (await req.json()) as PlaybackErrorRequest
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.channel_id || !body?.variant_id || !body?.error_type) {
    return apiError('missing_fields', 'campos obrigatórios ausentes', 422)
  }

  try {
    const device = await getDeviceByKey(body.device_key)
    if (isDatabaseConfigured) {
      await sql`
        insert into playback_errors (device_id, channel_id, variant_id, error_type, startup_time_ms)
        values (${device?.id || null}, ${body.channel_id}, ${body.variant_id}, ${body.error_type}, ${body.startup_time_ms || null})
      `
    }
    await degradeVariant(body.channel_id, body.variant_id, body.error_type)
    const variants = (await loadChannelVariants(body.channel_id)).filter((variant) => variant.id !== body.variant_id)
    const { primary } = rankVariants(variants)
    const res: PlaybackErrorResponse = primary
      ? { action: 'switch_stream', next_variant_id: primary.id, message: 'Trocando para uma rota alternativa.' }
      : { action: 'retry', message: 'Tentando reconectar ao sinal.' }
    return json(res)
  } catch (error) {
    return apiError('playback_error_failed', error instanceof Error ? error.message : 'Falha ao processar erro.', 500)
  }
}
