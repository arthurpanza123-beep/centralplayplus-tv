'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Channel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { playCue } from '@/lib/sounds'

interface ChannelPlayerProps {
  channel: Channel | null
  onClose: () => void
}

/** Truly fullscreen live player. No buttons or labels — close with Back. */
export function ChannelPlayer({ channel, onClose }: ChannelPlayerProps) {
  const [showHint, setShowHint] = useState(true)
  const hintTimer = useRef<number | null>(null)

  // Escape / Back closes fullscreen (capture phase, before global nav).
  useEffect(() => {
    if (!channel) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopImmediatePropagation()
        playCue('back')
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [channel, onClose])

  // Brief channel hint that fades away for a clean, immersive view.
  useEffect(() => {
    if (!channel) return
    setShowHint(true)
    hintTimer.current = window.setTimeout(() => setShowHint(false), 3000)
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current)
    }
  }, [channel])

  if (!channel || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reproduzindo ${channel.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black animate-cp-zoom-in cursor-none"
    >
      {/* Video surface (simulated) — fills the entire screen */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: `radial-gradient(circle at 50% 42%, ${channel.logoColor}26 0%, #04060b 72%)` }}
      >
        <div className="text-center">
          <div
            className="w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black text-white mx-auto mb-6 shadow-2xl"
            style={{ background: channel.logoColor }}
          >
            {channel.logoText}
          </div>
          <p className="text-3xl font-bold text-white/90">{channel.name}</p>
        </div>
      </div>

      {/* Brief auto-hiding channel hint (top-left) */}
      <div
        className={cn(
          'absolute top-8 left-8 flex items-center gap-3 transition-opacity duration-700',
          showHint ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />AO VIVO
        </span>
        <span className="text-white text-lg font-semibold drop-shadow">{channel.number} · {channel.name}</span>
      </div>
    </div>,
    document.body,
  )
}
