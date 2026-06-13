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
    <div className="fixed inset-0 z-40 flex items-center overflow-hidden bg-background animate-cp-fade-in">
      {/* ── Cozy living-room background ── */}
      <Image
        src="/login-room.png"
        alt=""
        fill
        priority
        aria-hidden
        className="object-cover object-center select-none pointer-events-none"
      />
      {/* Left-side cinematic darkening so the panel stays readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/30" />

      {/* ── Activation panel (left) ── */}
      <div className="relative z-10 flex flex-col w-full max-w-md px-10 lg:px-16 animate-cp-fade-up">
        {/* Brand logo */}
        <div className="relative w-52 h-16 mb-7 drop-shadow-[0_4px_24px_rgba(37,99,235,0.5)]">
          <Image src="/logo-full.png" alt="Central Play Plus" fill className="object-contain object-left" priority />
        </div>

        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white text-balance leading-[1.05] drop-shadow-lg">
          Ative sua TV
        </h1>
        <p className="mt-3 text-base text-white/70 max-w-xs leading-relaxed">
          Use o código abaixo no painel de ativação para liberar todo o catálogo.
        </p>

        {/* Device key card */}
        <div className="mt-7 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 px-7 py-6">
          <p className="text-[11px] font-bold tracking-[0.35em] text-white/50">DEVICE KEY</p>
          <p className="mt-2 text-4xl lg:text-5xl font-black tracking-[0.04em] text-white tabular-nums whitespace-nowrap drop-shadow-[0_0_18px_rgba(96,165,250,0.3)]">
            {DEVICE_KEY}
          </p>
          <div className="my-5 h-px w-full bg-white/10" />
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-cp-ring-spin" />
              </span>
            )}
            <span className="text-sm text-white/70 font-medium">
              {loading ? 'Liberando acesso…' : 'Aguardando ativação…'}
            </span>
          </div>
        </div>

        {/* Reload button */}
        <button
          onClick={reload}
          disabled={loading}
          autoFocus
          className="group mt-5 flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground text-lg font-bold tracking-wide shadow-xl shadow-primary/40 transition-all hover:bg-primary/90 hover:scale-[1.01] outline-none focus-visible:ring-4 focus-visible:ring-primary/60 disabled:opacity-80"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {loading ? 'Recarregando…' : 'Já ativei — entrar'}
        </button>
      </div>
    </div>
  )
}
