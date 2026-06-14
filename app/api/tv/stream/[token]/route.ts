import { apiError } from '@/lib/api/helpers'

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

  // TODO(Codex):
  // 1. const claims = verifyStreamToken(token)  // assinatura + exp + device_key
  // 2. if (!claims) return apiError('INVALID_TOKEN', 'Token inválido ou expirado', 401)
  // 3. const { primary } = rankVariants(await loadVariants(claims.channelId))
  // 4. return Response.redirect(primary.url, 302)  // ou stream/proxy real
  void token

  return apiError('NOT_IMPLEMENTED', 'Proxy de stream a implementar pelo Codex', 501)
}
