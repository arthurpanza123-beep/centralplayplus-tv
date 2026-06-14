import { json, apiError } from '@/lib/api/helpers'
import { credentialsFromServer, getDefaultServer, providerAccountFromCredentials } from '@/lib/catalog/service'
import { isDatabaseConfigured, sql } from '@/lib/db/client'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
import { degradeVariant, recoverVariant } from '@/lib/streaming/variant-health'

/**
 * Health-check automático (stub) — GET /api/cron/health-check
 * ------------------------------------------------------------------
 * Executado periodicamente pelo Vercel Cron (ver vercel.json). Em vez de
 * descobrir um stream quebrado só quando um usuário reclama, este job testa
 * proativamente as variantes de cada canal e atualiza o health_score.
 *
 * Fluxo previsto (Codex):
 *   1. Buscar variantes habilitadas (em lotes) do Postgres.
 *   2. Para cada uma, fazer um probe leve (HEAD/GET range no .m3u8 com timeout).
 *   3. OK    -> recoverVariant() (health = 100, last_ok_at = now)
 *      Falha -> degradeVariant() (health -= 20)
 *   4. Registrar um resumo para o painel /admin (aba Monitoramento).
 *
 * Segurança: o Vercel Cron envia o header Authorization: Bearer $CRON_SECRET.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError('UNAUTHORIZED', 'Cron não autorizado', 401)
  }

  if (!isDatabaseConfigured) return json({ ok: true, checked: 0, note: 'DATABASE_URL ausente; cron sem banco.' })

  try {
    const server = await getDefaultServer()
    const credentials = credentialsFromServer(server)
    const account = providerAccountFromCredentials(credentials)
    const adapter = getProviderAdapter(credentials)
    const variants = (await sql`
      select id, channel_id, provider_ref
      from channel_variants
      where status = 'active'
      order by last_checked_at nulls first, health_score asc
      limit ${Number(process.env.HEALTH_CHECK_BATCH_SIZE || 40)}
    `) as unknown as Array<{ id: string; channel_id: string; provider_ref: string }>

    let ok = 0
    let failed = 0
    for (const variant of variants) {
      try {
        const raw = await adapter.getStreamUrl({ account, provider_ref: variant.provider_ref, type: 'live' })
        const healthy = await probe(raw.url)
        if (healthy) {
          ok++
          await recoverVariant(variant.channel_id, variant.id)
        } else {
          failed++
          await degradeVariant(variant.channel_id, variant.id, 'cron_probe_failed')
        }
      } catch {
        failed++
        await degradeVariant(variant.channel_id, variant.id, 'cron_probe_error')
      }
    }

    return json({ ok: true, checked: variants.length, healthy: ok, failed })
  } catch (error) {
    return apiError('HEALTH_CHECK_FAILED', error instanceof Error ? error.message : 'Falha no health-check.', 500)
  }
}

async function probe(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 5000))
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { range: 'bytes=0-1024', accept: '*/*' },
      signal: controller.signal,
    })
    return response.status >= 200 && response.status < 500
  } finally {
    clearTimeout(timeout)
  }
}
