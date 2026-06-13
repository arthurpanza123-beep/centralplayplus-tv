/**
 * MainProviderAdapter — Implementação Xtream-like (SOMENTE BACKEND)
 * ------------------------------------------------------------------
 * Esqueleto da integração com o fornecedor principal (padrão Xtream
 * Codes). Cada método deve falar com o painel do fornecedor e devolver
 * dados CRUS (RawCategory/RawStream/...). A normalização para os tipos
 * públicos acontece em lib/catalog/normalize.ts (a ser criado).
 *
 * Backend implementado pelo Codex — aqui ficam apenas as assinaturas
 * e comentários de implementação.
 */

import type {
  ProviderAdapter,
  ProviderAccount,
  ProviderAccountStatus,
  ProviderCredentials,
  RawCategory,
  RawSeries,
  RawStream,
  RawStreamUrl,
} from './types'
import type { ContentType } from '@/lib/types/tv'

export class MainProviderAdapter implements ProviderAdapter {
  private readonly creds: ProviderCredentials

  constructor(credentials: ProviderCredentials) {
    this.creds = credentials
  }

  // ── Helpers internos ─────────────────────────────────────────────
  // TODO(Codex): centralizar fetch com timeout, retry e logging.
  // private async call<T>(action: string, params?: Record<string, string>): Promise<T> { ... }

  // ── Contas / clientes ────────────────────────────────────────────
  async createUser(_input: { plan_ref: string; note?: string }): Promise<ProviderAccount> {
    throw new Error('MainProviderAdapter.createUser não implementado')
  }

  async renewUser(_accountId: string, _input: { months: number }): Promise<ProviderAccount> {
    throw new Error('MainProviderAdapter.renewUser não implementado')
  }

  async blockUser(_accountId: string): Promise<void> {
    throw new Error('MainProviderAdapter.blockUser não implementado')
  }

  async unblockUser(_accountId: string): Promise<void> {
    throw new Error('MainProviderAdapter.unblockUser não implementado')
  }

  async getUserStatus(_accountId: string): Promise<ProviderAccountStatus> {
    throw new Error('MainProviderAdapter.getUserStatus não implementado')
  }

  async getAccountInfo(_accountId: string): Promise<ProviderAccount> {
    throw new Error('MainProviderAdapter.getAccountInfo não implementado')
  }

  // ── Catálogo ─────────────────────────────────────────────────────
  async getLiveCategories(): Promise<RawCategory[]> {
    throw new Error('MainProviderAdapter.getLiveCategories não implementado')
  }

  async getLiveStreams(_categoryRef?: string): Promise<RawStream[]> {
    throw new Error('MainProviderAdapter.getLiveStreams não implementado')
  }

  async getVodCategories(): Promise<RawCategory[]> {
    throw new Error('MainProviderAdapter.getVodCategories não implementado')
  }

  async getVodStreams(_categoryRef?: string): Promise<RawStream[]> {
    throw new Error('MainProviderAdapter.getVodStreams não implementado')
  }

  async getSeriesCategories(): Promise<RawCategory[]> {
    throw new Error('MainProviderAdapter.getSeriesCategories não implementado')
  }

  async getSeries(_categoryRef?: string): Promise<RawSeries[]> {
    throw new Error('MainProviderAdapter.getSeries não implementado')
  }

  // ── Reprodução ───────────────────────────────────────────────────
  async getStreamUrl(_input: {
    account: ProviderAccount
    provider_ref: string
    type: ContentType
  }): Promise<RawStreamUrl> {
    throw new Error('MainProviderAdapter.getStreamUrl não implementado')
  }
}
