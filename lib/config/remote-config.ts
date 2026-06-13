/**
 * Remote Config — valores padrão (SOMENTE BACKEND)
 * ------------------------------------------------------------------
 * Defaults seguros usados por GET /api/tv/config quando não há
 * override no banco (tv_remote_config). Permite mudar comportamento
 * dos apps sem republicar.
 *
 * Backend implementado pelo Codex.
 */

import type { RemoteConfig } from '@/lib/types/tv'

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  features: {
    preload_enabled: true,
    auto_fallback_enabled: true,
    health_score_enabled: true,
    favorites_enabled: true,
  },
  player: {
    startup_timeout_ms: 8000,
    buffer_timeout_ms: 10000,
    max_retry_per_variant: 1,
    max_fallback_attempts: 3,
  },
  cache: {
    catalog_ttl_seconds: 1800,
    config_ttl_seconds: 300,
  },
}
