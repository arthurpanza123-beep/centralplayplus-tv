'use client'

import { FormEvent, useMemo, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, LockKeyhole, Tv, XCircle } from 'lucide-react'

function normalizeKey(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.startsWith('CP')) return `CP-${clean.slice(2, 8)}`
  return clean.slice(0, 4)
}

export default function AtivarPage() {
  const initialKey = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return normalizeKey(new URLSearchParams(window.location.search).get('key') || '')
  }, [])
  const [deviceKey, setDeviceKey] = useState(initialKey)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/activation-portal/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_key: deviceKey, password }),
      })
      const data = await res.json().catch(() => ({}))
      setResult({
        ok: res.ok,
        message: data?.message || data?.error?.message || 'Não foi possível ativar a TV.',
      })
      if (res.ok) setPassword('')
    } catch {
      setResult({ ok: false, message: 'Sem conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="fixed inset-0 bg-cover bg-center opacity-45 blur-sm scale-105"
        style={{ backgroundImage: 'url(/login-room.webp)' }}
      />
      <div aria-hidden className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.32),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.55),#020617_72%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[1.75rem] border border-white/12 bg-black/60 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="mx-auto mb-5 h-16 w-56 relative">
            <Image src="/logo-full.webp" alt="Central Play Plus" fill className="object-contain" priority />
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Ativar TV</h1>
              <p className="text-xs font-medium text-white/55">Libere o aparelho com segurança.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">Device Key</span>
              <input
                value={deviceKey}
                onChange={(event) => setDeviceKey(normalizeKey(event.target.value))}
                placeholder="A4B6"
                autoCapitalize="characters"
                inputMode="text"
                maxLength={7}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-center text-3xl font-black tracking-[0.2em] text-white outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">Senha do operador</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Digite a senha"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] pl-12 pr-4 text-base font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-primary focus:ring-4 focus:ring-primary/20"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading || !deviceKey || !password}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-base font-black text-white shadow-xl shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {loading ? 'Ativando...' : 'Ativar TV'}
            </button>
          </form>

          {result && (
            <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              result.ok
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                : 'border-red-400/25 bg-red-400/10 text-red-100'
            }`}>
              {result.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
