'use client'

import { useState } from 'react'
import Image from 'next/image'
import { RefreshCw } from 'lucide-react'
import { unlockAudio, playIntroMusic } from '@/lib/sounds'

const DEVICE_KEY = 'A7K9-42XP'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  // Simulated activation: device is only considered activated after the first check.
  const [activated, setActivated] = useState(false)

  function reload() {
    // First user gesture — unlock audio so it can play once activated.
    unlockAudio()

    if (!activated) {
      // Not activated yet: shake the button and arm activation for next time.
      setActivated(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    // Activated — play the brand music and run the loading motion into the app.
    playIntroMusic()
    setLoading(true)
    setTimeout(onLogin, 2000)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-background animate-cp-fade-in">
      {/* ── Cozy living-room background (heavily blurred) ── */}
      <Image
        src="/login-room.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden
        className="object-cover object-center select-none pointer-events-none scale-105 blur-md"
      />

      {/* ── Moving neon orbs ── */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-16 w-[30rem] h-[30rem] rounded-full bg-blue-500/22 blur-[140px] animate-cp-neon-1" />
        <div className="absolute top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full bg-fuchsia-500/15 blur-[140px] animate-cp-neon-2" />
        <div className="absolute -bottom-24 left-1/4 w-[24rem] h-[24rem] rounded-full bg-cyan-400/15 blur-[140px] animate-cp-neon-3" />
      </div>

      {/* Even cinematic darkening + vignette to focus the centered card */}
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]" />

      {/* ── Loading overlay (elegant brand motion) ── */}
      {loading && (
        <div className="relative z-10 flex flex-col items-center text-center px-4 animate-cp-fade-in">
          <div className="relative w-72 h-20 animate-cp-logo-pulse">
            <Image src="/logo-full.webp" alt="Central Play Plus" fill className="object-contain object-center" priority />
          </div>
          {/* Progress bar */}
          <div className="mt-9 w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary/40 via-primary to-cyan-400 animate-cp-loadbar" />
          </div>
          <p className="mt-4 text-sm font-medium tracking-wide text-white/70">Liberando seu acesso…</p>
        </div>
      )}

      {/* ── Centered activation card ── */}
      {!loading && (
      <div className="relative z-10 w-full max-w-md mx-4 flex flex-col items-center text-center rounded-[1.75rem] bg-black/55 backdrop-blur-xl border border-white/15 ring-1 ring-white/5 shadow-2xl shadow-black/70 px-10 py-12 animate-cp-fade-up overflow-hidden">
        {/* Subtle top sheen */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full bg-primary/15 blur-3xl" />

        {/* Brand logo */}
        <div className="relative w-full max-w-[16rem] h-16 mx-auto mb-3 drop-shadow-[0_6px_32px_rgba(37,99,235,0.6)]">
          <Image src="/logo-full.webp" alt="Central Play Plus" fill className="object-contain object-center" priority />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white text-balance leading-tight drop-shadow-lg">
          Ative sua TV
        </h1>
        <p className="mt-2.5 text-sm text-white/65 leading-relaxed max-w-[16rem]">
          Use o código abaixo no painel de ativação para liberar todo o catálogo.
        </p>

        {/* Device key */}
        <div className="mt-7 w-full rounded-2xl bg-white/[0.04] border border-white/10 px-6 py-5">
          <p className="text-[10px] font-bold tracking-[0.4em] text-white/45">DEVICE KEY</p>
          <p className="mt-2 text-4xl font-black tracking-[0.05em] text-white tabular-nums whitespace-nowrap drop-shadow-[0_0_18px_rgba(96,165,250,0.35)]">
            {DEVICE_KEY}
          </p>
        </div>

        {/* Status */}
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <span className="relative flex h-4 w-4 items-center justify-center">
            {activated ? (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            ) : (
              <span className="absolute inline-flex h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-cp-ring-spin" />
            )}
          </span>
          <span className="text-sm text-white/65 font-medium">
            {activated ? 'Ativado! Clique para entrar.' : 'Aguardando ativação…'}
          </span>
        </div>

        {/* Reload button */}
        <button
          onClick={reload}
          autoFocus
          className={`group mt-7 w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold tracking-wide shadow-xl shadow-primary/40 transition-all hover:bg-primary/90 hover:scale-[1.02] outline-none focus-visible:ring-4 focus-visible:ring-primary/60 ${shake ? 'animate-cp-shake' : ''}`}
        >
          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          {activated ? 'Entrar' : 'Recarregar'}
        </button>
      </div>
      )}
    </div>
  )
}
