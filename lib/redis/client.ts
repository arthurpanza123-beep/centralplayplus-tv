import { Redis } from '@upstash/redis'

/**
 * Cliente Redis (Upstash) compartilhado.
 * Usado para: cache de catálogo, sessões ao vivo e rate limiting.
 *
 * Variáveis de ambiente fornecidas pela integração Upstash:
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 */
export const isRedisConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

type RedisLike = Pick<Redis, 'get' | 'set' | 'del' | 'hset' | 'hdel' | 'zadd' | 'zrange' | 'lpush' | 'ltrim' | 'incr' | 'lrange'>

const memory = new Map<string, unknown>()
const lists = new Map<string, unknown[]>()
const hashes = new Map<string, Record<string, unknown>>()
const sorted = new Map<string, Array<{ score: number; member: string }>>()

function memoryRedis(): RedisLike {
  return {
    async get(key) {
      return (memory.get(String(key)) ?? null) as never
    },
    async set(key, value) {
      memory.set(String(key), value)
      return 'OK' as never
    },
    async del(...keys) {
      let removed = 0
      for (const key of keys.flat()) {
        const k = String(key)
        if (memory.delete(k)) removed++
        if (lists.delete(k)) removed++
        if (hashes.delete(k)) removed++
        if (sorted.delete(k)) removed++
      }
      return removed as never
    },
    async hset(key, value) {
      const k = String(key)
      hashes.set(k, { ...(hashes.get(k) || {}), ...(value as Record<string, unknown>) })
      return 1 as never
    },
    async hdel(key, ...fields) {
      const current = hashes.get(String(key)) || {}
      let removed = 0
      for (const field of fields.flat()) {
        if (field in current) {
          delete current[String(field)]
          removed++
        }
      }
      return removed as never
    },
    async zadd(key, ...items) {
      const k = String(key)
      const list = sorted.get(k) || []
      for (const item of items.flat() as Array<{ score: number; member: string }>) {
        const index = list.findIndex((entry) => entry.member === item.member)
        if (index >= 0) list[index] = item
        else list.push(item)
      }
      sorted.set(k, list)
      return list.length as never
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async zrange(key: string, start: any, stop: any, options?: any) {
      const list = [...(sorted.get(String(key)) || [])].sort((a, b) =>
        (options as { rev?: boolean } | undefined)?.rev ? b.score - a.score : a.score - b.score,
      )
      return list.slice(Number(start), Number(stop) + 1).map((entry) => entry.member) as never
    },
    async lpush(key, value) {
      const list = lists.get(String(key)) || []
      list.unshift(value)
      lists.set(String(key), list)
      return list.length as never
    },
    async ltrim(key, start, stop) {
      const list = lists.get(String(key)) || []
      lists.set(String(key), list.slice(Number(start), Number(stop) + 1))
      return 'OK' as never
    },
    async incr(key) {
      const k = String(key)
      const next = Number(memory.get(k) || 0) + 1
      memory.set(k, next)
      return next as never
    },
    async lrange(key, start, stop) {
      const list = lists.get(String(key)) || []
      return list.slice(Number(start), Number(stop) + 1) as never
    },
  }
}

export const redis = (isRedisConfigured
  ? new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })
  : memoryRedis()) as Redis

// ─── Convenções de chaves ───────────────────────────────────────────────────
// Mantemos os prefixos centralizados para evitar colisões entre features.
export const KEYS = {
  // Cache de catálogo (TTL curto) — ex.: cat:home:v3
  catalog: (kind: string, version: string | number) => `cat:${kind}:${version}`,
  // Sessão de playback ao vivo (TTL = 2x heartbeat) — ex.: sess:CP-AB12-CD34
  session: (deviceKey: string) => `sess:${deviceKey}`,
  // Conjunto de sessões ativas (para o monitoramento) — sorted set por lastSeen
  activeSessions: () => `sess:active`,
  // Saúde de variante de canal — ex.: health:ch:1201
  channelHealth: (channelId: string | number) => `health:ch:${channelId}`,
  // Lista de relatos de "conteúdo não funcionando" (mais recentes primeiro)
  reports: () => `reports:list`,
  // Contador de relatos não lidos (badge no painel)
  reportsUnread: () => `reports:unread`,
  // Rate limit — gerenciado pelo @upstash/ratelimit (prefixo abaixo)
} as const
