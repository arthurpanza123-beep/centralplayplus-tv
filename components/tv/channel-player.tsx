'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Channel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { playCue } from '@/lib/sounds'

interface ChannelPlayerProps {
  channel: Channel | null
  onClose: () => void
}

/** Fullscreen live player overlay. Opens when a channel is expanded. */
export function ChannelPlayer({ channel, onClose }: ChannelPlayerProps) {
  const [showControls, setShowControls] = useState(true)
  const closeRef = useRef<HTMLButtonElement>(null)
  const hideTimer = useRef<number | null>(null)

  // Auto-focus the close button so the remote starts on a control.
  useEffect(() => {
    if (channel) {
      const id = window.setTimeout(() => closeRef.current?.focus(), 60)
      return () => window.clearTimeout(id)
    }
  }, [channel])

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

  // Auto-hide the overlay info after inactivity for an immersive feel.
  useEffect(() => {
    if (!channel) return
    function bump() {
      setShowControls(true)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setShowControls(false), 3500)
    }
    bump()
    window.addEventListener('keydown', bump)
    window.addEventListener('mousemove', bump)
    return () => {
      window.removeEventListener('keydown', bump)
      window.removeEventListener('mousemove', bump)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [channel])

  if (!channel || typeof document === 'undefined') return null

  const live = channel.programs.find((p) => p.isLive)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reproduzindo ${channel.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-black animate-cp-zoom-in"
    >
      {/* Video surface (simulated) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: `radial-gradient(circle at 50% 40%, ${channel.logoColor}33 0%, #05070d 70%)` }}
      >
        <div className="text-center">
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center text-3xl font-black text-white mx-auto mb-5 shadow-2xl"
            style={{ background: channel.logoColor }}
          >
            {channel.logoText}
          </div>
          <p className="text-2xl font-bold text-white/90">{channel.name}</p>
          <p className="text-sm text-white/50 mt-1">{channel.currentProgram}</p>
        </div>
      </div>

      {/* Top bar — channel info + back */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-between px-8 py-5 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />AO VIVO
          </span>
          <span className="text-white font-semibold">{channel.number} · {channel.name}</span>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Voltar"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur-sm transition-colors outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <X className="w-4 h-4" />Voltar
        </button>
      </div>

      <div className="flex-1" />

      {/* Bottom — current program info only (no manual controls) */}
      <div
        className={cn(
          'relative z-10 px-8 py-6 bg-gradient-to-t from-black/85 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        {live && (
          <>
            <p className="text-white font-bold text-lg">{live.title}</p>
            <p className="text-white/50 text-sm">{live.time} – {live.endTime}</p>
            <div className="mt-2 h-1 w-full max-w-md bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full" />
            </div>
          </>
        )}
        <p className="mt-4 text-xs text-white/40">Pressione Voltar no controle para sair</p>
      </div>
    </div>,
    document.body,
  )
}
