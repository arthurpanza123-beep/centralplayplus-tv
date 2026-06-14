import { redis, KEYS } from '@/lib/redis/client'
import type { StreamQuality } from '@/lib/types/tv'

/**
 * Variante de stream — representação INTERNA do servidor.
 * Contém dados que nunca vão para a TV (provider_ref, saúde, prioridade).
 * Mapeia 1:1 com a tabela `channel_variants` (ver scripts/001_schema.sql).
 */
export interface StreamVariant {
  id: string
  channelId: string
  quality: StreamQuality
  providerRef: string // referência opaca no fornecedor — NUNCA exposta
  priority: number // menor = preferida
  healthScore: number // 0–100
  enabled: boolean
}

/**
 * Seleção de variante de stream com fallback baseado em saúde.
 *
 * Cada canal tem N variantes (URLs/qualidades). Mantemos um `health_score`
 * (0–100) por variante no Postgres como fonte da verdade e um espelho rápido
 * no Redis para leitura quente durante o /play.
 *
 * Estratégia:
 *  1. Ordena por (saúde desc, prioridade asc).
 *  2. Devolve a melhor como `primary` e o restante como `fallbacks`.
 *  3. A TV tenta na ordem; ao falhar, reporta em /api/tv/playback-error,
 *     o que rebaixa a saúde da variante (degrade) e promove a próxima.
 */

export function rankVariants(variants: StreamVariant[]): {
  primary: StreamVariant | null
  fallbacks: StreamVariant[]
} {
  const sorted = [...variants]
    .filter((v) => v.enabled)
    .sort((a, b) => b.healthScore - a.healthScore || a.priority - b.priority)
  return { primary: sorted[0] ?? null, fallbacks: sorted.slice(1) }
}

/** Rebaixa a saúde de uma variante após um erro reportado pela TV. */
export async function degradeVariant(channelId: string, variantId: string, reason: string) {
  // TODO(Codex): persistir no Postgres:
  //   UPDATE channel_variants
  //   SET health_score = GREATEST(0, health_score - 20), last_error = ${reason}, last_error_at = now()
  //   WHERE id = ${variantId}
  // Espelho rápido no Redis para o /play não precisar bater no banco:
  try {
    await redis.hset(KEYS.channelHealth(channelId), { [variantId]: Date.now() })
  } catch {
    /* best-effort */
  }
  void reason
}

/** Restaura saúde quando o health-check confirma que a variante voltou. */
export async function recoverVariant(channelId: string, variantId: string) {
  // TODO(Codex): UPDATE channel_variants SET health_score = 100, last_ok_at = now() WHERE id = ${variantId}
  try {
    await redis.hdel(KEYS.channelHealth(channelId), variantId)
  } catch {
    /* best-effort */
  }
}
