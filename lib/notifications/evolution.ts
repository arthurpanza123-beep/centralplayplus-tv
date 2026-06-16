import crypto from 'crypto'

import { isDatabaseConfigured, sql } from '@/lib/db/client'

type IncidentInput = {
  key: string
  title: string
  message: string
  severity?: 'warning' | 'critical'
  cooldownMinutes?: number
}

async function ensureIncidentTable() {
  if (!isDatabaseConfigured) return
  await sql`
    create table if not exists playback_incidents (
      id uuid primary key default gen_random_uuid(),
      incident_key text not null,
      title text not null,
      message text not null,
      severity text not null default 'warning',
      notified_at timestamptz,
      created_at timestamptz not null default now()
    )
  `
  await sql`create index if not exists idx_playback_incidents_key_created on playback_incidents(incident_key, created_at desc)`
}

function evolutionConfigured() {
  return Boolean(
    process.env.EVOLUTION_API_URL
    && process.env.EVOLUTION_API_KEY
    && process.env.EVOLUTION_INSTANCE
    && process.env.EVOLUTION_NOTIFY_TO,
  )
}

function endpoint(path: string) {
  return `${process.env.EVOLUTION_API_URL!.replace(/\/+$/, '')}${path}`
}

async function sendEvolutionMessage(message: string) {
  if (!evolutionConfigured()) return false
  const instance = encodeURIComponent(process.env.EVOLUTION_INSTANCE!)
  const payload = {
    number: process.env.EVOLUTION_NOTIFY_TO,
    text: message,
  }
  const response = await fetch(endpoint(`/message/sendText/${instance}`), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: process.env.EVOLUTION_API_KEY!,
    },
    body: JSON.stringify(payload),
  })
  return response.ok
}

export async function notifyIncident(input: IncidentInput) {
  const cooldownMinutes = input.cooldownMinutes ?? 30
  const safeKey = crypto.createHash('sha256').update(input.key).digest('hex')

  await ensureIncidentTable()
  if (isDatabaseConfigured) {
    const cooldown = `${cooldownMinutes} minutes`
    const recent = (await sql`
      select id
      from playback_incidents
      where incident_key = ${safeKey}
        and created_at > now() - ${cooldown}::interval
      limit 1
    `) as unknown as { id: string }[]
    if (recent[0]) return { sent: false, deduped: true }
  }

  const sent = await sendEvolutionMessage(input.message)
  if (isDatabaseConfigured) {
    await sql`
      insert into playback_incidents (incident_key, title, message, severity, notified_at)
      values (${safeKey}, ${input.title}, ${input.message}, ${input.severity || 'warning'}, ${sent ? new Date().toISOString() : null})
    `
  }
  return { sent, deduped: false }
}
