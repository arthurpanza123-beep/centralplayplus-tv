/**
 * POST /api/admin/device/change-provider  { device_key, server_id }
 * Move o cliente para outro servidor/fornecedor.
 * Backend implementado pelo Codex.
 */
import { json, apiError, isAdmin } from '@/lib/api/helpers'

interface ChangeProviderBody {
  device_key: string
  server_id: string
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return apiError('unauthorized', 'Acesso negado', 401)

  let body: ChangeProviderBody
  try {
    body = (await req.json()) as ChangeProviderBody
  } catch {
    return apiError('invalid_body', 'JSON inválido', 400)
  }
  if (!body?.device_key || !body?.server_id) {
    return apiError('missing_fields', 'device_key e server_id são obrigatórios', 422)
  }

  // TODO(Codex):
  // 1. Criar/migrar conta no novo fornecedor (Provider Adapter do novo server_id).
  // 2. Atualizar vínculo do cliente (provider_accounts) e invalidar cache de catálogo.
  // 3. Sinalizar refresh de catálogo no próximo heartbeat.
  return json({ ok: true })
}
