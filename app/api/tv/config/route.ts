/**
 * GET /api/tv/config
 * Remote config — permite mudar comportamento dos apps sem republicar.
 * Backend implementado pelo Codex.
 */
import { json } from '@/lib/api/helpers'
import { DEFAULT_REMOTE_CONFIG } from '@/lib/config/remote-config'

export async function GET() {
  // TODO(Codex): mesclar DEFAULT_REMOTE_CONFIG com overrides de tv_remote_config.
  // Cachear em Redis com TTL = config.cache.config_ttl_seconds.
  return json(DEFAULT_REMOTE_CONFIG)
}
