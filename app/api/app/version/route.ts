/**
 * GET /api/app/version?platform=android_tv|lg_webos|samsung_tizen|roku
 * Controle de atualização por plataforma (update sugerido/obrigatório).
 * Backend implementado pelo Codex.
 */
import { json, apiError } from '@/lib/api/helpers'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import type { AppVersionResponse, Platform } from '@/lib/types/tv'

const PLATFORMS: Platform[] = ['android_tv', 'lg_webos', 'samsung_tizen', 'roku']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') as Platform | null
  if (!platform || !PLATFORMS.includes(platform)) {
    return apiError('invalid_platform', 'platform inválida ou ausente', 422)
  }

  if (isDatabaseConfigured) {
    const rows = (await sql`
      select
        latest_version,
        latest_version_code,
        min_required_version_code,
        force_update,
        coalesce(message, '') as message,
        coalesce(release_url, '') as release_url,
        coalesce(sha256, '') as sha256
      from tv_app_versions
      where platform = ${platform}
      order by created_at desc
      limit 1
    `) as unknown as AppVersionResponse[]
    if (rows[0]) return json(rows[0])
  }

  const res: AppVersionResponse = {
    latest_version: '1.3.0',
    latest_version_code: 4,
    min_required_version_code: 1,
    force_update: false,
    message: 'Bem-vindo à Central Play Plus.',
    release_url: process.env.APK_PUBLIC_URL || 'https://device.centralplayplus.com.br/app/centralplayplus.apk',
    sha256: process.env.APK_SHA256 || '',
  }
  return json(res)
}
