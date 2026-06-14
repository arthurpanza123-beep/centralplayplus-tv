'use client'

import { MonitorSmartphone, Wifi, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

interface Stats {
  total: number
  online: number
  active: number
  pending: number
  expiringSoon: number
}

export function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Dispositivos', value: stats.total, icon: MonitorSmartphone, tint: 'text-primary' },
    { label: 'Online agora', value: stats.online, icon: Wifi, tint: 'text-emerald-400' },
    { label: 'Ativos', value: stats.active, icon: CheckCircle2, tint: 'text-sky-400' },
    { label: 'Pendentes', value: stats.pending, icon: Clock, tint: 'text-amber-400' },
    { label: 'Expiram em 7d', value: stats.expiringSoon, icon: AlertTriangle, tint: 'text-red-400' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
          <c.icon className={`w-5 h-5 ${c.tint}`} />
          <span className="text-3xl font-black text-foreground tabular-nums">{c.value}</span>
          <span className="text-xs text-muted-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  )
}
