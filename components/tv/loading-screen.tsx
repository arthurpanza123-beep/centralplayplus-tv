'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { playIntroMusic } from '@/lib/sounds'

/**
 * Brand loading motion shown right before the catalog opens.
 * Reused both after a fresh activation and when an already-activated
 * device boots straight past the activation screen.
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    playIntroMusic()
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background animate-cp-fade-in">
      <div className="relative w-96 h-28 animate-cp-logo-pulse">
        <Image src="/logo-full.webp" alt="Central Play Plus" fill className="object-contain object-center" priority />
      </div>

      <div className="mt-9 w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary/40 via-primary to-cyan-400 animate-cp-loadbar" />
      </div>

      <p className="mt-4 text-sm font-medium tracking-wide text-white/70">Liberando seu acesso…</p>
    </div>
  )
}
