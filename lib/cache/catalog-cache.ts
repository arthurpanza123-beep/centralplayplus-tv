import { redis, KEYS } from '@/lib/redis/client'

/**
 * Cache de catálogo com padrão "stale-while-revalidate" simples.
 *
 * O catálogo (home, categorias, canais) muda pouco e é caro de montar a
 * partir do fornecedor, então cacheamos por um TTL curto. A versão (`version`)
 * vem do remote-config; ao publicar um catálogo novo, basta incrementar a
 * versão para invalidar tudo de uma vez.
 */
const DEFAULT_TTL = 300 // 5 minutos

export async function cached<T>(
  kind: string,
  version: string | number,
  loader: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const key = KEYS.catalog(kind, version)
  try {
    const hit = await redis.get<T>(key)
    if (hit) return hit
  } catch {
    // Se o Redis falhar, seguimos direto para o loader (degradação graciosa).
  }

  const fresh = await loader()

  try {
    await redis.set(key, fresh, { ex: ttl })
  } catch {
    // Cache best-effort: ignorar falha de escrita.
  }
  return fresh
}

/** Invalida explicitamente uma entrada de catálogo. */
export async function invalidate(kind: string, version: string | number): Promise<void> {
  try {
    await redis.del(KEYS.catalog(kind, version))
  } catch {
    /* best-effort */
  }
}
