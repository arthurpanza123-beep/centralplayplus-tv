import { json, apiError } from '@/lib/api/helpers'

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

  // TODO(Codex): implementar o probe das variantes e atualização de saúde.
  // const variants = await sql`SELECT * FROM channel_variants WHERE enabled = true`
  // const results = await Promise.allSettled(variants.map(probeVariant))
  // ...atualizar health_score conforme resultado.

  return json({ ok: true, checked: 0, note: 'Health-check a implementar pelo Codex' })
}
