'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, RefreshCw, Tv, Film, Clapperboard } from 'lucide-react'
import { unlockAudio, playIntroMusic } from '@/lib/sounds'

const DEVICE_KEY = 'A7K9-42XP'

// Real poster art for the showcase wall (already generated in /public/posters).
const WALL = [
  'm1', 's1', 'm7', 's16', 'm4', 's7',
  'm13', 's4', 'm16', 's2', 'm11', 's13',
  'm15', 's17', 'm6', 's8', 'm2', 's10',
]

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
    <div className="fixed inset-0 z-40 flex overflow-hidden bg-background animate-cp-fade-in">
      {/* ── Poster wall (background) ── */}
      <div className="absolute inset-0 select-none pointer-events-none" aria-hidden>
        <div className="grid grid-cols-6 gap-3 p-3 rotate-[-8deg] scale-125 origin-center opacity-90">
          {WALL.map((id, i) => (
            <div
              key={id}
              className="relative aspect-[2/3] rounded-lg overflow-hidden"
              style={{ transform: `translateY(${i % 2 === 0 ? '-12px' : '14px'})` }}
            >
              <Image src={`/posters/${id}.png`} alt="" fill sizes="220px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Cinematic darkening so text/panel stay readable */}
      <div className="absolute inset-0 bg-background/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col justify-center w-full max-w-xl px-12 lg:px-16 animate-cp-fade-up">
        {/* Brand logo */}
        <div className="relative w-60 h-20 mb-8 drop-shadow-[0_4px_24px_rgba(37,99,235,0.45)]">
          <Image src="/logo-full.png" alt="Central Play Plus" fill className="object-contain object-left" priority />
        </div>

        <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance leading-[1.05]">
          Filmes, séries e canais{' '}
          <span className="text-primary">sem limites.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md leading-relaxed">
          Ative sua TV com o código abaixo e libere todo o catálogo em segundos.
        </p>

        {/* Feature chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: Tv, label: '2.312 canais ao vivo' },
            { icon: Film, label: '23.894 filmes' },
            { icon: Clapperboard, label: '6.128 séries' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-white/10 text-xs font-medium text-foreground/90">
              <Icon className="w-3.5 h-3.5 text-primary" />{label}
            </span>
          ))}
        </div>

        {/* Device key card */}
        <div className="mt-8 rounded-2xl bg-card/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 px-8 py-7">
          <p className="text-xs font-bold tracking-[0.35em] text-muted-foreground">DEVICE KEY</p>
          <p className="mt-2 text-4xl lg:text-5xl font-black tracking-[0.04em] text-foreground tabular-nums whitespace-nowrap drop-shadow-[0_0_18px_rgba(96,165,250,0.25)]">
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
            <span className="text-base text-muted-foreground font-medium">
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
