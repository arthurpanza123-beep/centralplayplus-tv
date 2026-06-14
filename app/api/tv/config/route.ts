/**
 * GET /api/tv/config
 * Remote config — permite mudar comportamento dos apps sem republicar.
 * Backend implementado pelo Codex.
 */
import { json } from '@/lib/api/helpers'
import { DEFAULT_REMOTE_CONFIG } from '@/lib/config/remote-config'
import { cached } from '@/lib/cache/catalog-cache'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import type { RemoteConfig } from '@/lib/types/tv'

export async function GET() {
  const config = await cached('remote-config', 'global', async () => {
    if (!isDatabaseConfigured) return DEFAULT_REMOTE_CONFIG
    const rows = (await sql`
      select config from tv_remote_config where key = 'global' limit 1
    `) as unknown as { config: Partial<RemoteConfig> }[]
    const override = rows[0]?.config || {}
    return {
      ...DEFAULT_REMOTE_CONFIG,
      ...override,
      features: { ...DEFAULT_REMOTE_CONFIG.features, ...(override.features || {}) },
      player: { ...DEFAULT_REMOTE_CONFIG.player, ...(override.player || {}) },
      cache: { ...DEFAULT_REMOTE_CONFIG.cache, ...(override.cache || {}) },
    }
  }, DEFAULT_REMOTE_CONFIG.cache.config_ttl_seconds)
  return json(config)
}
