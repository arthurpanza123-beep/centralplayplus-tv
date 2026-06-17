import { apiError } from '@/lib/api/helpers'
import { verifyImageToken } from '@/lib/security/tokens'

const ALLOWED_CONTENT_TYPES = /^(image\/|application\/octet-stream\b)/i

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const claims = verifyImageToken(token)
  if (!claims) return apiError('INVALID_IMAGE_TOKEN', 'Imagem expirada ou inválida.', 401)

  let url: URL
  try {
    url = new URL(claims.src)
  } catch {
    return apiError('INVALID_IMAGE_URL', 'URL de imagem inválida.', 422)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return apiError('INVALID_IMAGE_PROTOCOL', 'Protocolo de imagem não permitido.', 422)
  }

  try {
    const upstream = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(Number(process.env.TV_IMAGE_TIMEOUT_MS || 10_000)),
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'user-agent': 'CentralPlayPlusTV/1.0 AndroidTV',
      },
    })
    if (!upstream.ok || !upstream.body) return apiError('IMAGE_UPSTREAM_FAILED', 'Imagem indisponível.', 502)

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    if (!ALLOWED_CONTENT_TYPES.test(contentType)) return apiError('INVALID_IMAGE_RESPONSE', 'Resposta de imagem inválida.', 502)

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    return apiError('IMAGE_PROXY_FAILED', error instanceof Error ? error.message : 'Falha ao carregar imagem.', 502)
  }
}
