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
 * TODO(Codex): carregar credenciais a partir de provider_servers no banco
 * e cachear instâncias por server_id. Adicionar novos `kind` conforme
 * forem integrados novos fornecedores (M3U, custom, etc).
 */
export function getProviderAdapter(credentials: ProviderCredentials): ProviderAdapter {
  switch (credentials.kind) {
    case 'xtream':
      return new MainProviderAdapter(credentials)
    case 'm3u':
      // TODO(Codex): implementar M3uProviderAdapter
      throw new Error('Provider M3U ainda não implementado')
    case 'custom':
      // TODO(Codex): implementar adapter custom
      throw new Error('Provider custom ainda não implementado')
    default:
      throw new Error(`Fornecedor desconhecido: ${(credentials as ProviderCredentials).kind}`)
  }
}
