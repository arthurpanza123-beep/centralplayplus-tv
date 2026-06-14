/**
 * Provider Adapter — Factory / seletor de fornecedor (SOMENTE BACKEND)
 * ------------------------------------------------------------------
 * Ponto único para obter o adapter correto a partir das credenciais
 * de um servidor/fornecedor. A API e os workers SEMPRE pedem o adapter
 * por aqui — nunca instanciam um fornecedor diretamente.
 *
 * Backend implementado pelo Codex.
 */

import type { ProviderAdapter, ProviderCredentials } from './types'
import { MainProviderAdapter } from './provider-main'

/**
 * Retorna a implementação de adapter para o fornecedor informado.
 *
 */
export function getProviderAdapter(credentials: ProviderCredentials): ProviderAdapter {
  switch (credentials.kind) {
    case 'xtream':
      return new MainProviderAdapter(credentials)
    case 'm3u':
      if (credentials.base_url && credentials.username && credentials.password) return new MainProviderAdapter({ ...credentials, kind: 'xtream' })
      throw new Error('Provider M3U requer m3u_url ou credenciais Xtream-compatible.')
    case 'custom':
      if (credentials.base_url && credentials.username && credentials.password) return new MainProviderAdapter({ ...credentials, kind: 'xtream' })
      throw new Error('Provider custom sem adapter configurado.')
    default:
      throw new Error(`Fornecedor desconhecido: ${(credentials as ProviderCredentials).kind}`)
  }
}
