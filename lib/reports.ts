/**
 * Relatos de "conteúdo não funcionando"
 * ------------------------------------------------------------------
 * Quando o cliente clica em "Não está funcionando" no player, a TV envia
 * um relato para cá. Os relatos ficam no Redis (Upstash) e aparecem na
 * caixa de entrada do painel /admin, para o operador encaminhar à mídia.
 *
 * Funciona já: grava e lê do Redis. O Codex pode espelhar no Postgres
 * (tabela content_reports) para histórico permanente — ver scripts/001_schema.sql.
 */

import { redis, KEYS } from '@/lib/redis/client'

export type ReportKind = 'channel' | 'movie' | 'series'

export interface ContentReport {
  id: string
  kind: ReportKind
  contentId: string
  contentTitle: string
  /** Categoria/gênero ou categoria do canal, para ajudar a triagem. */
  category?: string
  /** Device Key que reportou (para o operador identificar o cliente). */
  deviceKey?: string
  /** Mensagem opcional digitada pelo cliente. */
  note?: string
  /** Motivo selecionado (tela preta, travando, sem som, etc.). */
  reason?: string
  status: 'new' | 'sent_to_media' | 'resolved'
  createdAt: number
}

const MAX_REPORTS = 500

/** Grava um novo relato (mais recentes primeiro) e incrementa os não lidos. */
export async function pushReport(
  data: Omit<ContentReport, 'id' | 'status' | 'createdAt'>,
): Promise<ContentReport> {
  const report: ContentReport = {
    ...data,
    id: `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'new',
    createdAt: Date.now(),
  }
  await redis.lpush(KEYS.reports(), JSON.stringify(report))
  await redis.ltrim(KEYS.reports(), 0, MAX_REPORTS - 1)
  await redis.incr(KEYS.reportsUnread())
  return report
}

/** Lê os relatos mais recentes para o painel. */
export async function listReports(limit = 100): Promise<ContentReport[]> {
  const raw = await redis.lrange<string | ContentReport>(KEYS.reports(), 0, limit - 1)
  return raw.map((r) => (typeof r === 'string' ? (JSON.parse(r) as ContentReport) : r))
}

/** Zera o contador de não lidos (quando o operador abre a caixa). */
export async function markReportsRead(): Promise<void> {
  await redis.set(KEYS.reportsUnread(), 0)
}

/** Quantidade de relatos não lidos (badge). */
export async function unreadReports(): Promise<number> {
  const n = await redis.get<number>(KEYS.reportsUnread())
  return n ?? 0
}
