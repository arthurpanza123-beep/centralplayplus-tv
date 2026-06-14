import { redis, KEYS } from '@/lib/redis/client'
import type { CurrentScreen, Platform } from '@/lib/types/tv'

/**
 * Sessões de TV ao vivo (Redis) — alimenta a aba "Monitoramento" do /admin.
 *
 * O heartbeat de cada TV chama `touchSession`. Guardamos o estado num hash
 * com TTL = 2x o intervalo de heartbeat; se a TV some, a chave expira e a
 * sessão sai do "online" automaticamente (sem precisar de cron de limpeza).
 */
export interface LiveSession {
  deviceKey: string
  platform: Platform
  screen: CurrentScreen
  channelId?: string
  appVersion: string
  lastSeen: number // epoch ms
}

const HEARTBEAT_SECONDS = 30
const SESSION_TTL = HEARTBEAT_SECONDS * 2

export async function touchSession(s: Omit<LiveSession, 'lastSeen'>): Promise<void> {
  const now = Date.now()
  try {
    await redis.set(KEYS.session(s.deviceKey), { ...s, lastSeen: now }, { ex: SESSION_TTL })
    // sorted set para listar/ordenar por atividade recente
    await redis.zadd(KEYS.activeSessions(), { score: now, member: s.deviceKey })
  } catch {
    /* best-effort: monitoramento não pode derrubar o heartbeat */
  }
}

/** Lista as sessões ativas (para o painel). */
export async function listActiveSessions(limit = 100): Promise<LiveSession[]> {
  try {
    const keys = await redis.zrange<string[]>(KEYS.activeSessions(), 0, limit - 1, { rev: true })
    if (!keys.length) return []
    const sessions = await Promise.all(keys.map((k) => redis.get<LiveSession>(KEYS.session(k))))
    return sessions.filter((s): s is LiveSession => Boolean(s))
  } catch {
    return []
  }
}
