import { json, apiError } from '@/lib/api/helpers'
import { verifyActivationPassword } from '@/lib/activation/password'
import { ActivationProviderError, activateDevice, normalizeDeviceKey } from '@/lib/devices/service'
import { isDatabaseConfigured, sql } from '@/lib/db/client'
import { clientId } from '@/lib/redis/rate-limit'

type Body = {
  device_key?: string
  password?: string
}

async function ensureActivationLogTable() {
  if (!isDatabaseConfigured) return
  await sql`
    create table if not exists activation_portal_logs (
      id uuid primary key default gen_random_uuid(),
      device_key text,
      ip_address text,
      success boolean not null default false,
      reason text,
      created_at timestamptz not null default now()
    )
  `
  await sql`create index if not exists idx_activation_portal_logs_created on activation_portal_logs(created_at desc)`
}

async function logAttempt(input: { deviceKey?: string; ip: string; success: boolean; reason?: string }) {
  await ensureActivationLogTable()
  if (!isDatabaseConfigured) return
  await sql`
    insert into activation_portal_logs (device_key, ip_address, success, reason)
    values (${input.deviceKey || null}, ${input.ip}, ${input.success}, ${input.reason || null})
  `
}

async function rateLimitAllows(input: { deviceKey?: string; ip: string }) {
  await ensureActivationLogTable()
  if (!isDatabaseConfigured) return true
  const rows = (await sql`
    select count(*)::int as count
    from activation_portal_logs
    where success = false
      and created_at > now() - interval '10 minutes'
      and (
        ip_address = ${input.ip}
        or (${input.deviceKey || null}::text is not null and device_key = ${input.deviceKey})
      )
  `) as unknown as { count: number }[]
  return (rows[0]?.count || 0) < 5
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = await req.json() as Body
  } catch {
    return apiError('invalid_body', 'JSON inválido.', 400)
  }

  const deviceKey = normalizeDeviceKey(body.device_key || '')
  const ip = clientId(req)
  if (!(await rateLimitAllows({ ip, deviceKey }))) {
    await logAttempt({ deviceKey, ip, success: false, reason: 'rate_limited' })
    return apiError('rate_limited', 'Muitas tentativas. Aguarde alguns minutos.', 429)
  }

  if (!deviceKey || !body.password) {
    await logAttempt({ deviceKey, ip, success: false, reason: 'missing_fields' })
    return apiError('missing_fields', 'Informe a Device Key e a senha.', 422)
  }

  if (!verifyActivationPassword(body.password)) {
    await logAttempt({ deviceKey, ip, success: false, reason: 'invalid_password' })
    return apiError('invalid_password', 'Senha inválida.', 401)
  }

  try {
    const device = await activateDevice({
      device_key: deviceKey,
      client_name: process.env.DEFAULT_YELLOWBOX_CLIENT || 'Central Play Plus',
      plan: process.env.DEFAULT_ACTIVATION_PLAN || 'Mensal',
      days: Number(process.env.DEFAULT_ACTIVATION_DAYS || 30),
    })
    await logAttempt({ deviceKey, ip, success: true })
    return json({ ok: true, status: device.status, message: 'TV ativada com sucesso' })
  } catch (error) {
    await logAttempt({ deviceKey, ip, success: false, reason: 'activation_failed' })
    if (error instanceof ActivationProviderError) {
      return apiError(error.code, 'Falha segura ao validar provider de playback.', 502)
    }
    return apiError('activation_failed', error instanceof Error ? error.message : 'Falha ao ativar TV.', 500)
  }
}
