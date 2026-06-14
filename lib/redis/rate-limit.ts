import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './client'

/**
 * Rate limiting + anti-abuso (Upstash Ratelimit, sliding window).
 *
 * Limites separados por área para não punir tráfego legítimo:
 * - activation: tentativas de ativar/registrar uma Device Key (mais restrito)
 * - play: pedidos de URL de stream (evita scraping/compartilhamento)
 * - api: limite genérico de leitura do catálogo
 *
 * Uso numa rota:
 *   const { success } = await limiters.play.limit(`play:${deviceKey}`)
 *   if (!success) return apiError('RATE_LIMITED', 'Muitas requisições', 429)
 */
export const limiters = {
  activation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'rl:activation',
    analytics: true,
  }),
  play: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:play',
    analytics: true,
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    prefix: 'rl:api',
    analytics: true,
  }),
}

/** Extrai um identificador estável da requisição (Device Key > IP). */
export function clientId(req: Request, deviceKey?: string | null): string {
  if (deviceKey) return deviceKey
  const fwd = req.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || 'unknown'
}
