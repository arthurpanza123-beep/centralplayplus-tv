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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Soft ambient blue glow on graphite */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(59,130,246,0.22),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.10),transparent_55%)]" />

      {/* Official logo with glow + gentle bob */}
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute w-[28rem] h-72 rounded-full bg-blue-500/25 blur-3xl animate-cp-glow" />
        <div className="relative w-[34rem] max-w-[80vw] h-56 animate-cp-bob drop-shadow-[0_0_50px_rgba(59,130,246,0.45)]">
          <Image src="/logo-full.png" alt="Central Play Plus" fill className="object-contain" priority />
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
