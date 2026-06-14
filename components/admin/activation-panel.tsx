'use client'

import { useState } from 'react'
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { PLANS, PROVIDERS } from '@/lib/admin/demo-data'

const PLAN_DAYS: Record<string, number> = { Mensal: 30, Trimestral: 90, Semestral: 180, Anual: 365 }

interface Props {
  onActivate: (deviceKey: string, clientName: string, plan: string, provider: string, days: number) => Promise<{ ok: boolean; error?: string }>
  busy: boolean
}

export function ActivationPanel({ onActivate, busy }: Props) {
  const [deviceKey, setDeviceKey] = useState('')
  const [clientName, setClientName] = useState('')
  const [plan, setPlan] = useState<string>(PLANS[0])
  const [provider, setProvider] = useState<string>(PROVIDERS[0])
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const canSubmit = deviceKey.trim().length >= 4 && clientName.trim().length >= 2 && !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFeedback(null)
    const res = await onActivate(deviceKey.trim().toUpperCase(), clientName.trim(), plan, provider, PLAN_DAYS[plan])
    if (res.ok) {
      setFeedback({ ok: true, msg: `Dispositivo ${deviceKey.trim().toUpperCase()} ativado para ${clientName.trim()}.` })
      setDeviceKey('')
      setClientName('')
    } else {
      setFeedback({ ok: false, msg: res.error || 'Falha ao ativar dispositivo.' })
    }
  }

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors'

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 text-primary">
          <KeyRound className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Ativar dispositivo</h2>
          <p className="text-xs text-muted-foreground">Vincule a Device Key a um cliente e plano.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Device Key</span>
            <input value={deviceKey} onChange={(e) => setDeviceKey(e.target.value)} placeholder="CP-XXXX-XXX" className={`${inputCls} font-mono uppercase`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Cliente</span>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Plano</span>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
              {PLANS.map((p) => <option key={p} value={p}>{p} ({PLAN_DAYS[p]} dias)</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Fornecedor</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        {feedback && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {feedback.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-opacity disabled:opacity-40 hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Ativar dispositivo
        </button>
      </form>
    </div>
  )
}
