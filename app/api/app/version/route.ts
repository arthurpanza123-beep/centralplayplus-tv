/**
 * GET /api/app/version?platform=android_tv|lg_webos|samsung_tizen|roku
 * Controle de atualização por plataforma (update sugerido/obrigatório).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import type { AppVersionResponse, Platform } from '@/lib/types/tv'

const PLATFORMS: Platform[] = ['android_tv', 'lg_webos', 'samsung_tizen', 'roku']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') as Platform | null
  if (!platform || !PLATFORMS.includes(platform)) {
    return apiError('invalid_platform', 'platform inválida ou ausente', 422)
  }

  // TODO(Codex): buscar a última versão por plataforma em tv_app_versions.
  const res: AppVersionResponse = {
    latest_version: '1.0.0',
    latest_version_code: 1,
    min_required_version_code: 1,
    force_update: false,
    message: 'Bem-vindo à Central Play Plus.',
    release_url: `https://downloads.centralplayplus.com.br/releases/${platform}/1.0.0`,
    sha256: '',
  }
  return json(res)
}
