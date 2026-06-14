'use client'

/**
 * Camada de dados do painel de administração.
 *
 * Hoje opera com os dados de demonstração (`demo-data.ts`) para que o painel
 * seja totalmente navegável antes do backend existir. As mutações já chamam os
 * endpoints reais de admin (`/api/admin/device/*`); enquanto eles retornarem
 * 501, o painel atualiza o estado local de forma otimista e segue funcionando.
 *
 * TODO(Codex):
 *  - Trocar a carga inicial por um GET real (ex.: `/api/admin/devices`) usando SWR.
 *  - Remover a atualização otimista local e passar a revalidar via `mutate`.
 *  - A chave de admin deve vir de uma sessão autenticada, não de um header fixo.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  DEMO_DEVICES,
  DEMO_PLAYBACK_ERRORS,
  DEMO_CHANNEL_HEALTH,
  type AdminDeviceView,
  type DeviceStatus,
} from '@/lib/admin/demo-data'

// Header usado nas chamadas admin. TODO(Codex): substituir por sessão real.
function adminHeaders(): HeadersInit {
  return { 'content-type': 'application/json', 'x-admin-key': 'DEMO_ADMIN_KEY' }
}

async function callAdmin(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: adminHeaders(), body: JSON.stringify(body) })
    if (res.ok) return { ok: true }
    // 501 = endpoint ainda não implementado pelo Codex. Tratamos como "pendente".
    if (res.status === 501) return { ok: true, error: 'pending_backend' }
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export function useAdminData() {
  const [devices, setDevices] = useState<AdminDeviceView[]>(DEMO_DEVICES)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const patchDevice = useCallback((deviceKey: string, patch: Partial<AdminDeviceView>) => {
    setDevices((prev) => prev.map((d) => (d.deviceKey === deviceKey ? { ...d, ...patch } : d)))
  }, [])

  // Ativar: vincula cliente + plano e marca como ativo.
  const activate = useCallback(
    async (deviceKey: string, clientName: string, plan: string, provider: string, days: number) => {
      setBusyKey(deviceKey)
      const expiresAt = new Date(Date.now() + days * 86400_000).toISOString()
      const res = await callAdmin('/api/admin/device/activate', { device_key: deviceKey, client_name: clientName, plan, provider, days })
      if (res.ok) patchDevice(deviceKey, { status: 'active', clientName, plan, provider, expiresAt })
      setBusyKey(null)
      return res
    },
    [patchDevice],
  )

  const setBlocked = useCallback(
    async (deviceKey: string, blocked: boolean) => {
      setBusyKey(deviceKey)
      const res = await callAdmin('/api/admin/device/block', { device_key: deviceKey, blocked })
      if (res.ok) patchDevice(deviceKey, { status: blocked ? 'blocked' : 'active' })
      setBusyKey(null)
      return res
    },
    [patchDevice],
  )

  const renew = useCallback(
    async (deviceKey: string, days: number) => {
      setBusyKey(deviceKey)
      const current = devices.find((d) => d.deviceKey === deviceKey)
      const base = current?.expiresAt ? new Date(current.expiresAt).getTime() : Date.now()
      const from = Math.max(base, Date.now())
      const expiresAt = new Date(from + days * 86400_000).toISOString()
      const res = await callAdmin('/api/admin/device/renew', { device_key: deviceKey, days })
      if (res.ok) patchDevice(deviceKey, { status: 'active', expiresAt })
      setBusyKey(null)
      return res
    },
    [devices, patchDevice],
  )

  const changeProvider = useCallback(
    async (deviceKey: string, provider: string) => {
      setBusyKey(deviceKey)
      const res = await callAdmin('/api/admin/device/change-provider', { device_key: deviceKey, provider })
      if (res.ok) patchDevice(deviceKey, { provider })
      setBusyKey(null)
      return res
    },
    [patchDevice],
  )

  const stats = useMemo(() => {
    const total = devices.length
    const online = devices.filter((d) => d.online).length
    const active = devices.filter((d) => d.status === 'active').length
    const pending = devices.filter((d) => d.status === 'pending').length
    const expiringSoon = devices.filter((d) => {
      if (!d.expiresAt) return false
      const diff = new Date(d.expiresAt).getTime() - Date.now()
      return diff > 0 && diff < 7 * 86400_000
    }).length
    return { total, online, active, pending, expiringSoon }
  }, [devices])

  return {
    devices,
    stats,
    busyKey,
    activate,
    setBlocked,
    renew,
    changeProvider,
    playbackErrors: DEMO_PLAYBACK_ERRORS,
    channelHealth: DEMO_CHANNEL_HEALTH,
  }
}

export type { AdminDeviceView, DeviceStatus }
