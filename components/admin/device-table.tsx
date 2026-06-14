'use client'

import { useState } from 'react'
import { Search, Ban, ShieldCheck, RefreshCw, Repeat, Loader2, ChevronDown } from 'lucide-react'
import { StatusBadge, OnlineDot, relTime, fmtDate } from '@/components/admin/ui'
import { PROVIDERS, type AdminDeviceView, type DeviceStatus } from '@/lib/admin/demo-data'

interface Props {
  devices: AdminDeviceView[]
  busyKey: string | null
  onBlock: (key: string, blocked: boolean) => void
  onRenew: (key: string, days: number) => void
  onChangeProvider: (key: string, provider: string) => void
}

const FILTERS: { id: DeviceStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'blocked', label: 'Bloqueados' },
  { id: 'expired', label: 'Expirados' },
]

export function DeviceTable({ devices, busyKey, onBlock, onRenew, onChangeProvider }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DeviceStatus | 'all'>('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const filtered = devices.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return d.deviceKey.toLowerCase().includes(q) || (d.clientName || '').toLowerCase().includes(q)
  })

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por Device Key ou cliente…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="font-semibold px-4 py-3">Device Key</th>
              <th className="font-semibold px-4 py-3">Cliente</th>
              <th className="font-semibold px-4 py-3">Status</th>
              <th className="font-semibold px-4 py-3">Plano</th>
              <th className="font-semibold px-4 py-3">Fornecedor</th>
              <th className="font-semibold px-4 py-3">Expira</th>
              <th className="font-semibold px-4 py-3">Visto</th>
              <th className="font-semibold px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const busy = busyKey === d.deviceKey
              return (
                <tr key={d.deviceKey} className="border-b border-border/60 last:border-0 hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{d.deviceKey}</td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{d.clientName || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{d.plan || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap capitalize">{d.provider}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(d.expiresAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><div className="flex flex-col gap-0.5"><OnlineDot online={d.online} /><span className="text-[11px] text-muted-foreground">{relTime(d.lastSeenAt)}</span></div></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {/* Block / unblock */}
                      {d.status === 'blocked' ? (
                        <button onClick={() => onBlock(d.deviceKey, false)} disabled={busy} title="Desbloquear"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors">
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => onBlock(d.deviceKey, true)} disabled={busy} title="Bloquear"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {/* Renew */}
                      <button onClick={() => onRenew(d.deviceKey, 30)} disabled={busy} title="Renovar +30 dias"
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 disabled:opacity-40 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {/* Change provider */}
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === d.deviceKey ? null : d.deviceKey)} disabled={busy} title="Trocar fornecedor"
                          className="flex items-center gap-1 px-2 h-8 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
                          <Repeat className="w-4 h-4" />
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {openMenu === d.deviceKey && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-border bg-card shadow-xl py-1">
                              {PROVIDERS.map((p) => (
                                <button key={p} onClick={() => { onChangeProvider(d.deviceKey, p); setOpenMenu(null) }}
                                  className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-background transition-colors ${d.provider === p ? 'text-primary font-semibold' : 'text-foreground'}`}>
                                  {p}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum dispositivo encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
