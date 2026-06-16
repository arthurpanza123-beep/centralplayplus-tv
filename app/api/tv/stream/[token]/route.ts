import { apiError } from '@/lib/api/helpers'
import { credentialsFromServer, getDefaultServer } from '@/lib/catalog/service'
import { findActiveProviderAccount, getDeviceByKey } from '@/lib/devices/service'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
import { verifyStreamToken } from '@/lib/security/tokens'

async function upstreamLooksPlayable(url: string) {
  const timeout = AbortSignal.timeout(7000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: timeout,
      headers: {
        range: 'bytes=0-255',
        'user-agent': 'CentralPlayPlusTV/1.0 AndroidTV',
        accept: '*/*',
      },
    })
    let head = ''
    const reader = response.body?.getReader()
    if (reader) {
      const first = await reader.read()
      if (first.value) head = Buffer.from(first.value).toString('utf8', 0, 256)
      await reader.cancel().catch(() => {})
    }
    const looksHtml = /<html|<!doctype|xtream codes|not found|forbidden|unauthorized|error/i.test(head)
    return response.ok && !looksHtml
  } catch {
    return false
  }
}

/**
 * Proxy de stream (stub) — GET /api/tv/stream/:token
 * ------------------------------------------------------------------
 * Em vez de entregar a URL real do fornecedor para a TV, /play devolve
 * um TOKEN curto e assinado. A TV abre ESTE endpoint, que:
 *
 *   1. Valida o token (assinatura + expiração + device_key).
 *   2. Resolve a variante atual do canal (lib/streaming/variant-health).
 *   3. Faz stream/redirect para a URL real do fornecedor.
 *
 * Vantagens:
 *   - A URL/credencial do fornecedor nunca aparece no app (segurança).
 *   - Permite trocar de variante sem reabrir o player (basta o token
 *     resolver para outra variante quando a saúde mudar).
 *   - Centraliza métricas de banda e bloqueio por device.
 *
 * Decisão de arquitetura para o Codex:
 *   - REDIRECT (302) para a URL do fornecedor: simples e barato, mas
 *     expõe a URL final ao player (aceitável para HLS curto).
 *   - PROXY real (stream do .m3u8/.ts pelo servidor): esconde tudo,
 *     porém consome banda/CPU do backend. Recomendado atrás de um CDN.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const claims = verifyStreamToken(token)
  if (!claims) return apiError('INVALID_TOKEN', 'Token inválido ou expirado', 401)

  try {
    const device = await getDeviceByKey(claims.device_key)
    if (!device || device.id !== claims.device_id || device.status !== 'active') {
      return apiError('DEVICE_NOT_ACTIVE', 'Aparelho não autorizado para reproduzir.', 403)
    }
    const account = await findActiveProviderAccount(device)
    if (!account) return apiError('PROVIDER_ACCOUNT_MISSING', 'Conta do fornecedor não vinculada.', 403)
    const server = await getDefaultServer()
    const adapter = getProviderAdapter(credentialsFromServer(server))
    const raw = await adapter.getStreamUrl({ account, provider_ref: claims.provider_ref, type: claims.type })
    if (!(await upstreamLooksPlayable(raw.url))) {
      return apiError('STREAM_UPSTREAM_UNAVAILABLE', 'Stream indisponível no fornecedor.', 502)
    }
    return Response.redirect(raw.url, 302)
  } catch (error) {
    return apiError('STREAM_RESOLVE_FAILED', error instanceof Error ? error.message : 'Falha ao resolver stream.', 502)
  }
}
