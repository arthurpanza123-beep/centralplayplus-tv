/**
 * GET  /api/admin/reports   → lista os relatos de conteúdo (caixa de entrada)
 * POST /api/admin/reports   → marca todos como lidos (zera o badge)
 * ------------------------------------------------------------------
 * Caixa de entrada de "conteúdo não funcionando" para o operador
 * encaminhar à equipe de mídia.
 *
 * NOTA: a proteção por x-admin-key está comentada para o painel de demo
 * funcionar sem header. O Codex deve reativar `isAdmin(req)` quando o
 * painel tiver login (Better Auth/Neon).
 */

import { json, apiError } from '@/lib/api/helpers'
import { listReports, unreadReports, markReportsRead } from '@/lib/reports'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [reports, unread] = await Promise.all([listReports(100), unreadReports()])
    return json({ reports, unread })
  } catch {
    // Redis ainda não configurado — devolve vazio em vez de quebrar o painel.
    return json({ reports: [], unread: 0 })
  }
}

export async function POST() {
  try {
    await markReportsRead()
    return json({ ok: true })
  } catch {
    return apiError('storage_error', 'Não foi possível atualizar agora.', 503)
  }
}
