/**
 * Provider Adapter — Tipos internos (SOMENTE BACKEND)
 * ------------------------------------------------------------------
 * Estes tipos representam dados crus/sensíveis do fornecedor.
 * NUNCA devem ser enviados para os apps de TV. A API normaliza tudo
 * para os tipos públicos em lib/types/tv.ts antes de responder.
 *
 * Backend implementado pelo Codex.
 */

import type { ContentType, StreamQuality } from '@/lib/types/tv'

// ──────────────────────────────────────────────────────────────────
// Credenciais do fornecedor (sensível — fica só no servidor/DB)
// ──────────────────────────────────────────────────────────────────
export interface ProviderCredentials {
  /** Identificador do servidor/fornecedor no banco (provider_servers.id) */
  server_id: string
  /** Tipo do fornecedor — define qual adapter usar. */
  kind: 'xtream' | 'm3u' | 'custom' | 'yellowbox' | 'yellow_box' | 'yellow-box'
  base_url: string // DNS do painel/Xtream
  username?: string // Xtream
  password?: string // Xtream
  api_key?: string // fornecedores com API key
  m3u_url?: string // fornecedores baseados em M3U
}

// ──────────────────────────────────────────────────────────────────
// Conta do cliente no fornecedor (sensível)
// ──────────────────────────────────────────────────────────────────
export interface ProviderAccount {
  account_id: string // id interno do fornecedor
  username: string
  password: string
  expires_at: string | null
  max_connections: number
  status: 'active' | 'blocked' | 'expired'
}

export interface ProviderAccountStatus {
  status: 'active' | 'blocked' | 'expired'
  expires_at: string | null
  active_connections: number
  max_connections: number
}

// ──────────────────────────────────────────────────────────────────
// Catálogo cru do fornecedor (antes da normalização)
// ──────────────────────────────────────────────────────────────────
export interface RawCategory {
  provider_ref: string
  name: string
  type: ContentType
}

export interface RawStream {
  provider_ref: string
  name: string
  logo?: string
  category_ref: string
  type: ContentType
  quality?: StreamQuality
  /** Agrupador para detectar variantes do mesmo canal (ex: "globo-rj"). */
  group_key?: string
}

export interface RawSeries {
  provider_ref: string
  name: string
  cover?: string
  category_ref: string
  seasons?: number
}

/** Link de reprodução cru retornado pelo fornecedor (sensível). */
export interface RawStreamUrl {
  url: string
  expires_at?: string
}

// ──────────────────────────────────────────────────────────────────
// Contrato do adapter — toda comunicação com o fornecedor passa aqui.
// Trocar de fornecedor = implementar uma nova classe deste contrato.
// ──────────────────────────────────────────────────────────────────
export interface ProviderAdapter {
  // Gestão de contas/clientes no fornecedor
  createUser(input: { plan_ref: string; note?: string }): Promise<ProviderAccount>
  renewUser(accountId: string, input: { months: number }): Promise<ProviderAccount>
  blockUser(accountId: string): Promise<void>
  unblockUser(accountId: string): Promise<void>
  getUserStatus(accountId: string): Promise<ProviderAccountStatus>
  getAccountInfo(accountId: string): Promise<ProviderAccount>

  // Catálogo
  getLiveCategories(): Promise<RawCategory[]>
  getLiveStreams(categoryRef?: string): Promise<RawStream[]>
  getVodCategories(): Promise<RawCategory[]>
  getVodStreams(categoryRef?: string): Promise<RawStream[]>
  getSeriesCategories(): Promise<RawCategory[]>
  getSeries(categoryRef?: string): Promise<RawSeries[]>

  // Reprodução — retorna URL crua que a API vai proxar/assinar
  getStreamUrl(input: { account: ProviderAccount; provider_ref: string; type: ContentType }): Promise<RawStreamUrl>
}
