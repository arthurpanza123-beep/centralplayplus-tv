'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, RefreshCw } from 'lucide-react'
import { unlockAudio, playIntroMusic } from '@/lib/sounds'

const DEVICE_KEY = 'A7K9-42XP'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false)

  function reload() {
    // First user gesture — unlock audio and start the brand music.
    unlockAudio()
    playIntroMusic()
    setLoading(true)
    setTimeout(onLogin, 1100)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-background animate-cp-fade-in">
      {/* Soft graphite background */}
      <Image
        src="/bg-graphite.png"
        alt=""
        fill
        priority
        aria-hidden="true"
        className="object-cover select-none pointer-events-none"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(59,130,246,0.16),transparent_62%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/50" />

      {/* ── Activation panel ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-2xl animate-cp-fade-up">
        {/* Brand logo */}
        <div className="relative w-72 h-24 mb-6 drop-shadow-[0_4px_24px_rgba(37,99,235,0.45)]">
          <Image src="/logo-full.png" alt="Central Play Plus" fill className="object-contain" priority />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-foreground text-balance">
          Ative sua TV
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground">
          Use o código abaixo para liberar seu acesso
        </p>

        {/* Device key card */}
        <div className="mt-8 w-full max-w-xl rounded-3xl bg-card/70 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 px-10 py-9">
          <p className="text-sm font-bold tracking-[0.35em] text-muted-foreground">DEVICE KEY</p>
          <p className="mt-3 text-6xl md:text-7xl font-black tracking-[0.08em] text-foreground tabular-nums drop-shadow-[0_0_18px_rgba(96,165,250,0.25)]">
            {DEVICE_KEY}
          </p>
          <div className="my-6 h-px w-full bg-white/10" />
          <div className="flex items-center justify-center gap-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-cp-ring-spin" />
              </span>
            )}
            <span className="text-lg text-muted-foreground font-medium">
              {loading ? 'Liberando acesso…' : 'Aguardando ativação…'}
            </span>
          </div>
        </div>

        {/* Reload button */}
        <button
          onClick={reload}
          disabled={loading}
          autoFocus
          className="group mt-7 w-full max-w-xl flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-lg font-bold tracking-wide shadow-xl shadow-blue-600/40 transition-all hover:shadow-blue-500/60 hover:scale-[1.01] outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 disabled:opacity-80"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {loading ? 'Recarregando…' : 'Já ativou? Recarregar acesso'}
        </button>
      </div>
    </div>
  )
}
