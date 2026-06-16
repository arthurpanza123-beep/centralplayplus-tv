/**
 * Central Play Plus TV — Contratos públicos da API
 * ------------------------------------------------------------------
 * Estes tipos definem o "contrato" entre os apps de TV (Android TV,
 * LG webOS, Samsung Tizen, Roku) e a API própria da Central Play Plus.
 *
 * IMPORTANTE (segurança): nenhum tipo aqui deve conter dados sensíveis
 * do fornecedor (DNS/usuário/senha Xtream, API key, M3U cru). Esses
 * dados ficam EXCLUSIVAMENTE no backend (ver lib/providers/*).
 *
 * Backend implementado pelo Codex — aqui ficam apenas os schemas.
 */

// ──────────────────────────────────────────────────────────────────
// Plataformas suportadas
// ──────────────────────────────────────────────────────────────────
export type Platform = 'android_tv' | 'lg_webos' | 'samsung_tizen' | 'roku'

// ──────────────────────────────────────────────────────────────────
// Ativação por Device Key
// ──────────────────────────────────────────────────────────────────
export type DeviceStatus = 'pending' | 'active' | 'blocked' | 'expired'

/** POST /api/tv/register — corpo enviado pela TV */
export interface RegisterDeviceRequest {
  platform: Platform
  app_version: string
  device_model: string
  install_id: string // uuid gerado e guardado localmente na TV
}

/** POST /api/tv/register — resposta */
export interface RegisterDeviceResponse {
  device_key: string // ex: "CP-482913"
  status: DeviceStatus
  poll_interval_seconds: number
}

/** GET /api/tv/status/:deviceKey — resposta */
export interface DeviceStatusResponse {
  status: DeviceStatus
  access_token?: string
  refresh_token?: string
  expires_at?: string // ISO 8601
  message?: string
}

/** POST /api/tv/activate-token — troca/renova o token seguro */
export interface ActivateTokenRequest {
  device_key: string
  refresh_token: string
}

export interface ActivateTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: string
}

// ──────────────────────────────────────────────────────────────────
// Remote Config — GET /api/tv/config
// ──────────────────────────────────────────────────────────────────
export interface RemoteConfig {
  features: {
    preload_enabled: boolean
    auto_fallback_enabled: boolean
    health_score_enabled: boolean
    favorites_enabled: boolean
  }
  player: {
    startup_timeout_ms: number
    buffer_timeout_ms: number
    max_retry_per_variant: number
    max_fallback_attempts: number
  }
  cache: {
    catalog_ttl_seconds: number
    config_ttl_seconds: number
  }
}

// ──────────────────────────────────────────────────────────────────
// Catálogo normalizado (o que a TV recebe)
// ──────────────────────────────────────────────────────────────────
export type ContentType = 'live' | 'movie' | 'vod' | 'series'
export type StreamQuality = 'SD' | 'HD' | 'FHD' | '4K' | 'ALT'

/** Uma rota/stream de um canal. provider_ref NUNCA vai para a TV. */
export interface ChannelVariantPublic {
  id: string
  quality: StreamQuality
  // provider_ref fica só no servidor — não exposto aqui de propósito.
}

export interface Channel {
  id: string
  name: string
  logo: string
  category: string
  type: ContentType
  variants: ChannelVariantPublic[]
}

export interface Category {
  id: string
  name: string
  type: ContentType
  order?: number
}

/** GET /api/tv/home — blocos prontos para a tela inicial */
export interface HomeRow {
  id: string
  title: string
  type: ContentType
  items: CatalogItem[]
}

export interface CatalogItem {
  id: string
  title: string
  poster: string
  type: ContentType
  quality?: StreamQuality
  year?: number
  rating?: number
  genre?: string
}

export interface HomeResponse {
  rows: HomeRow[]
  catalog_version: string
}

// ──────────────────────────────────────────────────────────────────
// Reprodução / melhor rota / fallback
// ──────────────────────────────────────────────────────────────────
export interface PlayableVariant {
  id: string
  quality: StreamQuality
  stream_url: string // link temporário/proxado — validade curta
}

/** GET /api/tv/channel/:id/play */
export interface ChannelPlayResponse {
  ok?: boolean
  type?: ContentType
  title?: string
  playback_url?: string
  mime_type?: string
  stream_format?: 'hls' | 'ts' | 'mp4' | 'unknown'
  channel_id: string
  selected_variant: PlayableVariant
  fallback_variants: PlayableVariant[]
  max_start_time_ms: number
}

export type PlaybackErrorType =
  | 'buffer_timeout'
  | 'startup_timeout'
  | 'http_403'
  | 'http_404'
  | 'network_error'
  | 'stream_dropped'
  | 'unknown'

/** POST /api/tv/playback-error */
export interface PlaybackErrorRequest {
  device_key: string
  platform: Platform
  channel_id: string
  variant_id: string
  error_type: PlaybackErrorType
  startup_time_ms?: number
}

export interface PlaybackErrorResponse {
  action: 'switch_stream' | 'retry' | 'show_error'
  next_variant_id?: string
  message: string
}

export type PlaybackEventType =
  | 'channel_open'
  | 'first_frame'
  | 'buffering_start'
  | 'buffering_end'
  | 'fallback_executed'
  | 'session_end'

/** POST /api/tv/playback-event */
export interface PlaybackEventRequest {
  device_key: string
  platform: Platform
  event: PlaybackEventType
  channel_id?: string
  variant_id?: string
  value_ms?: number // ex: tempo até primeiro frame
  at: string // ISO 8601
}

// ──────────────────────────────────────────────────────────────────
// Sessão / Heartbeat — POST /api/tv/heartbeat
// ──────────────────────────────────────────────────────────────────
export type CurrentScreen = 'home' | 'channels' | 'player' | 'movies' | 'series' | 'kids' | 'search' | 'settings'

export interface HeartbeatRequest {
  device_key: string
  platform: Platform
  app_version: string
  current_screen: CurrentScreen
  current_channel_id?: string
}

export interface HeartbeatResponse {
  ok: boolean
  // o servidor pode pedir que a TV recarregue config/catálogo
  should_refresh_config?: boolean
  should_refresh_catalog?: boolean
  // ou forçar logout/bloqueio remoto
  force_logout?: boolean
  message?: string
}

// ──────────────────────────────────────────────────────────────────
// Atualização por plataforma — GET /api/app/version
// ──────────────────────────────────────────────────────────────────
export interface AppVersionResponse {
  latest_version: string
  latest_version_code: number
  min_required_version_code: number
  force_update: boolean
  message: string
  release_url: string
  sha256: string
}

// ──────────────────────────────────────────────────────────────────
// Envelope padrão de erro da API
// ──────────────────────────────────────────────────────────────────
export interface ApiError {
  error: {
    code: string
    message: string
  }
}
