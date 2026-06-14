/**
 * POST /api/tv/report-problem
 * ------------------------------------------------------------------
 * A TV chama aqui quando o cliente clica em "Não está funcionando".
 * Grava o relato (Redis) para aparecer na caixa de entrada do /admin.
 *
 * Body: { kind, contentId, contentTitle, category?, deviceKey?, reason?, note? }
 */

import { json, apiError } from '@/lib/api/helpers'
import { limiters } from '@/lib/redis/rate-limit'
import { pushReport, type ReportKind } from '@/lib/reports'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('invalid_body', 'JSON inválido.', 400)
  }

  const kind = body.kind as ReportKind
  const contentId = typeof body.contentId === 'string' ? body.contentId : ''
  const contentTitle = typeof body.contentTitle === 'string' ? body.contentTitle : ''

  if (!['channel', 'movie', 'series'].includes(kind) || !contentId || !contentTitle) {
    return apiError('invalid_body', 'kind, contentId e contentTitle são obrigatórios.', 422)
  }

  // Anti-abuso: limita relatos por dispositivo/IP.
  try {
    const id = (typeof body.deviceKey === 'string' && body.deviceKey) ||
      req.headers.get('x-forwarded-for') || 'anon'
    const { success } = await limiters.api.limit(`report:${id}`)
    if (!success) return apiError('rate_limited', 'Muitos relatos. Tente novamente em instantes.', 429)
  } catch {
    // Se o rate limiter não estiver configurado, segue sem bloquear.
  }

  try {
    const report = await pushReport({
      kind,
      contentId,
      contentTitle,
      category: typeof body.category === 'string' ? body.category : undefined,
      deviceKey: typeof body.deviceKey === 'string' ? body.deviceKey : undefined,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      note: typeof body.note === 'string' ? body.note : undefined,
    })
    return json({ ok: true, id: report.id })
  } catch {
    return apiError('storage_error', 'Não foi possível registrar o relato agora.', 503)
  }
}
