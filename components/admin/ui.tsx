'use client'

import { cn } from '@/lib/utils'
import type { DeviceStatus } from '@/lib/admin/demo-data'

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, { label: string; cls: string }> = {
    active: { label: 'Ativo', cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' },
    pending: { label: 'Pendente', cls: 'bg-amber-500/15 text-amber-400 ring-amber-500/30' },
    blocked: { label: 'Bloqueado', cls: 'bg-red-500/15 text-red-400 ring-red-500/30' },
    expired: { label: 'Expirado', cls: 'bg-muted text-muted-foreground ring-border' },
  }
  const { label, cls } = map[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1', cls)}>
      {label}
    </span>
  )
}

export function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('w-2 h-2 rounded-full', online ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40')} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

export function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground tabular-nums w-9 text-right">{score}%</span>
    </div>
  )
}

export function relTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min${diff < 0 ? '' : ' atrás'}`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h${diff < 0 ? '' : ' atrás'}`
  const d = Math.round(h / 24)
  return diff < 0 ? `em ${d}d` : `${d}d atrás`
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
