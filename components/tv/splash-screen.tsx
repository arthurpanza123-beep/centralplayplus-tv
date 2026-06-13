'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

/**
 * Cinematic opening: the mascot pops in and "broadcasts" signal rings,
 * the wordmark reveals, then a slim progress bar fills before handing off.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 2600
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(Math.round((1 - Math.pow(1 - t, 2)) * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onDone, 300)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Ambient radial glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]"
      />

      {/* Mascot + broadcast signal rings */}
      <div className="relative z-10 mb-9 flex h-44 w-44 items-center justify-center">
        {[0, 0.6, 1.2].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="animate-cp-signal absolute h-40 w-40 rounded-full border-2 border-primary/40"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

        {/* Pops in, then idles with a soft wiggle */}
        <div className="animate-cp-mascot-in">
          <div className="animate-cp-wiggle relative h-36 w-36 drop-shadow-[0_8px_40px_rgba(37,99,235,0.6)]">
            <Image src="/mascot.png" alt="Central Play Plus" fill className="object-contain" priority />
          </div>
        </div>
      </div>

      {/* Wordmark reveal (delayed until the mascot lands) */}
      <div
        className="animate-cp-logo-reveal relative z-10 h-24 w-80 max-w-[80vw]"
        style={{ animationDelay: '0.8s' }}
      >
        <Image src="/logo-full.png" alt="Central Play Plus" fill className="object-contain object-center" priority />
      </div>

      {/* Progress bar */}
      <div
        className="animate-cp-fade-in relative z-10 mt-10 flex flex-col items-center gap-3"
        style={{ animationDelay: '1.1s' }}
      >
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/50 via-primary to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm font-medium tracking-wide text-white/55">
          Preparando seu catálogo… {progress}%
        </p>
      </div>
    </div>
  )
}
