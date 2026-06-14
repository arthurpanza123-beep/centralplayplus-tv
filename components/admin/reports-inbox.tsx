'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inbox, Radio, Film, Tv2, RefreshCw, Send, Check } from 'lucide-react'
import type { ContentReport } from '@/lib/reports'

const KIND_META: Record<ContentReport['kind'], { icon: typeof Radio; label: string }> = {
  channel: { icon: Radio, label: 'Canal' },
  movie: { icon: Film, label: 'Filme' },
  series: { icon: Tv2, label: 'Série' },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

/**
 * Caixa de entrada de relatos de "conteúdo não funcionando".
 * Lê de /api/admin/reports (Redis) e atualiza sozinha a cada 20s.
 */
export function ReportsInbox() {
  const [reports, setReports] = useState<ContentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports', { cache: 'no-store' })
      const data = await res.json()
      setReports(data.reports ?? [])
      // Marca como lidos ao abrir.
      fetch('/api/admin/reports', { method: 'POST' }).catch(() => {})
    } catch {
      /* mantém o estado atual */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 20_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400">
            <Inbox className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-foreground">Relatos de conteúdo</h2>
            <p className="text-xs text-muted-foreground">Problemas reportados pelos clientes nas TVs.</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Carregando…</div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-6">
          <Inbox className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Nenhum relato no momento</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Quando um cliente tocar em &quot;Não está funcionando&quot;, o relato aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 max-h-[28rem] overflow-y-auto">
          {reports.map((r) => {
            const meta = KIND_META[r.kind]
            const Icon = meta.icon
            const sent = sentIds.has(r.id)
            return (
              <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/40 transition-colors">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                    <span className="text-sm font-bold text-foreground truncate">{r.contentTitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.reason || 'Sem motivo informado'}
                    {r.deviceKey && <span className="ml-2 font-mono text-foreground/70">· {r.deviceKey}</span>}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(r.createdAt)}</span>
                <button
                  onClick={() => setSentIds((s) => new Set(s).add(r.id))}
                  disabled={sent}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    sent
                      ? 'bg-green-500/15 text-green-400 cursor-default'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {sent ? 'Encaminhado' : 'Encaminhar à mídia'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
