import { Redis } from '@upstash/redis'

/**
 * Cliente Redis (Upstash) compartilhado.
 * Usado para: cache de catálogo, sessões ao vivo e rate limiting.
 *
 * Variáveis de ambiente fornecidas pela integração Upstash:
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

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
  // Rate limit — gerenciado pelo @upstash/ratelimit (prefixo abaixo)
} as const
