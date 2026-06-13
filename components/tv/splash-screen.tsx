'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 2400
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out
      setProgress(Math.round((1 - Math.pow(1 - t, 2)) * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onDone, 350)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#070b16]">
      {/* Ambient cinematic glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.18),transparent_50%)]" />

      {/* Mascot with glow + rotating ring */}
      <div className="relative flex items-center justify-center mb-10">
        <div className="absolute w-64 h-64 rounded-full bg-blue-500/30 blur-3xl animate-cp-glow" />
        <div className="absolute w-56 h-56 rounded-full border border-blue-400/20 animate-cp-ring-spin"
          style={{ borderTopColor: 'rgba(96,165,250,0.7)' }} />
        <div className="relative w-40 h-40 animate-cp-bob drop-shadow-[0_0_40px_rgba(59,130,246,0.55)]">
          <Image src="/mascot-icon.png" alt="Central Play Plus" fill className="object-contain" priority />
        </div>
      </div>

      {/* Brand name */}
      <div className="relative flex flex-col items-center animate-cp-fade-up" style={{ animationDelay: '0.25s' }}>
        <h1 className="text-5xl font-black tracking-tight leading-none">
          <span className="text-white">CENTRAL </span>
          <span className="text-blue-400">PLAY</span>
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-sm font-black tracking-wider">PLUS</span>
          <span className="text-xs font-semibold tracking-[0.35em] text-white/40 uppercase">Filmes · Séries · Canais</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mt-12 w-72 animate-cp-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-[width] duration-100 ease-out shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-center text-xs text-white/40 font-medium tracking-wide">
          Preparando seu catálogo… {progress}%
        </p>
      </div>
    </div>
  )
}
