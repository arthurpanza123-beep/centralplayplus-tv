'use client'

import { Activity, AlertTriangle, HeartPulse } from 'lucide-react'
import { HealthBar, relTime } from '@/components/admin/ui'
import type { AdminDeviceView, PlaybackErrorView, ChannelHealthView } from '@/lib/admin/demo-data'

interface Props {
  devices: AdminDeviceView[]
  errors: PlaybackErrorView[]
  health: ChannelHealthView[]
}

export function Monitoring({ devices, errors, health }: Props) {
  const liveSessions = devices.filter((d) => d.online && d.status === 'active')

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Live sessions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Sessões ao vivo</h3>
          <span className="ml-auto text-xs font-semibold text-emerald-400">{liveSessions.length}</span>
        </div>
        <div className="flex flex-col gap-3">
          {liveSessions.map((d) => (
            <div key={d.deviceKey} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{d.clientName || d.deviceKey}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{d.deviceKey}</p>
              </div>
              <span className="text-[11px] text-muted-foreground capitalize shrink-0">{d.platform.replace('_', ' ')}</span>
            </div>
          ))}
          {liveSessions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sessão ativa.</p>}
        </div>
      </div>

      {/* Recent playback errors */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-foreground">Erros de playback</h3>
          <span className="ml-auto text-xs font-semibold text-red-400">{errors.length}</span>
        </div>
        <div className="flex flex-col gap-3">
          {errors.map((e) => (
            <div key={e.id} className="flex items-start gap-3">
              <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold font-mono shrink-0 mt-0.5">{e.errorCode}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{e.channelName} <span className="text-muted-foreground">· {e.variantLabel}</span></p>
                <p className="text-[11px] text-muted-foreground font-mono">{e.deviceKey} · {relTime(e.at)}</p>
              </div>
            </div>
          ))}
          {errors.length === 0 && <p className="text-sm text-muted-foreground">Sem erros recentes.</p>}
        </div>
      </div>

      {/* Channel / stream health */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Saúde dos streams</h3>
        </div>
        <div className="flex flex-col gap-3.5">
          {health.map((h) => (
            <div key={h.channelName} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{h.channelName}</span>
                <span className="text-muted-foreground">{h.healthyVariants}/{h.totalVariants} variantes ok</span>
              </div>
              <HealthBar score={h.healthScore} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
