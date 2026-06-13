'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Plus, Star } from 'lucide-react'
import type { Movie, Series } from '@/lib/types'

interface ContentModalProps {
  item: Movie | Series | null
  onClose: () => void
}

export function ContentModal({ item, onClose }: ContentModalProps) {
  const watchBtnRef = useRef<HTMLButtonElement>(null)

  // Move focus into the modal when it opens (TV remote starts on "Assistir").
  useEffect(() => {
    if (item) {
      const id = window.setTimeout(() => watchBtnRef.current?.focus(), 60)
      return () => window.clearTimeout(id)
    }
  }, [item])

  // Escape / Back closes the modal. Capture phase so it runs before global nav.
  useEffect(() => {
    if (!item) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [item, onClose])

  if (!item || typeof document === 'undefined') return null

  const isMovie = item.type === 'movie'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${item.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="animate-cp-fade-up relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl bg-card shadow-2xl shadow-black/70 scrollbar-none">
        {/* Hero with real poster art */}
        <div className="relative h-80 shrink-0">
          <img
            src={`/posters/${item.id}.png`}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title + actions over hero */}
          <div className="absolute bottom-0 left-0 right-0 p-7">
            <h2 className="text-4xl font-black text-white text-balance leading-tight tracking-tight drop-shadow-lg mb-4">
              {item.title}
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                ref={watchBtnRef}
                className="flex items-center gap-2 px-7 py-2.5 rounded-md bg-white text-black text-sm font-bold hover:bg-white/85 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Play className="w-5 h-5 fill-current" />
                Assistir
              </button>
              <button className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-white/60 text-white hover:border-white hover:bg-white/10 transition-colors" aria-label="Minha Lista">
                <Plus className="w-5 h-5" />
              </button>
              <button className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-white/60 text-white hover:border-white hover:bg-white/10 transition-colors" aria-label="Avaliar">
                <Star className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 pb-7">
          <div className="flex flex-wrap items-center gap-2.5 mb-4 text-sm">
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <Star className="w-4 h-4 fill-current" />{item.rating}
            </span>
            <span className="text-muted-foreground">{isMovie ? (item as Movie).year : (item as Series).year}</span>
            <span className="text-muted-foreground">
              {isMovie
                ? (item as Movie).duration
                : `${(item as Series).seasons} ${(item as Series).seasons === 1 ? 'temporada' : 'temporadas'}`}
            </span>
            <span className="text-muted-foreground">{item.genre}</span>
            <span className="px-2 py-0.5 rounded border border-border text-xs text-foreground">{item.quality}</span>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed mb-6 max-w-2xl">
            {item.description}
          </p>

          {/* Cast */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Elenco</h3>
            <div className="flex flex-wrap gap-5">
              {item.cast.map((member) => (
                <div key={member.name} className="flex flex-col items-center gap-1.5 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})`,
                      border: '2px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <p className="text-xs text-foreground font-medium leading-tight max-w-[80px]">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight max-w-[80px]">{member.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Director / Creator */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {isMovie ? 'Direção' : 'Criação'}
            </h3>
            <p className="text-sm text-foreground">
              {isMovie ? (item as Movie).director : (item as Series).creator}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
