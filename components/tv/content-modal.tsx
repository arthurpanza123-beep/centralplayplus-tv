'use client'

import { X, Play, Plus, Star } from 'lucide-react'
import type { Movie, Series } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ContentModalProps {
  item: Movie | Series | null
  onClose: () => void
}

export function ContentModal({ item, onClose }: ContentModalProps) {
  if (!item) return null

  const isMovie = item.type === 'movie'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${item.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-border/40 bg-card shadow-2xl shadow-black/60">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-foreground hover:bg-black/60 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-0">
          {/* Poster */}
          <div
            className="shrink-0 w-48 relative flex items-end p-4"
            style={{
              background: `linear-gradient(160deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)`,
            }}
          >
            <p className="text-white font-bold text-sm uppercase leading-tight text-balance drop-shadow-md tracking-wide">
              {item.title}
            </p>
          </div>

          {/* Details */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-bold text-foreground text-balance mb-3">
              {item.title}
            </h2>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted-foreground">
              <span>{isMovie ? (item as Movie).year : (item as Series).year}</span>
              <span className="w-px h-4 bg-border" aria-hidden />
              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-xs font-bold">
                {item.rating}
              </span>
              <span className="w-px h-4 bg-border" aria-hidden />
              {isMovie ? (
                <span>{(item as Movie).duration}</span>
              ) : (
                <span>
                  {(item as Series).seasons}{' '}
                  {(item as Series).seasons === 1 ? 'temporada' : 'temporadas'}
                </span>
              )}
              <span className="w-px h-4 bg-border" aria-hidden />
              <span>{item.genre}</span>
              <span className="px-2 py-0.5 rounded border border-border text-xs">
                {item.quality}
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {item.description}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Play className="w-4 h-4 fill-current" />
                Assistir
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors">
                <Plus className="w-4 h-4" />
                Minha Lista
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors">
                <Star className="w-4 h-4" />
                Avaliar
              </button>
            </div>

            <hr className="border-border/40 mb-4" />

            {/* Cast */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Elenco
              </h3>
              <div className="flex flex-wrap gap-4">
                {item.cast.map((member) => (
                  <div key={member.name} className="flex flex-col items-center gap-1 text-center">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white',
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})`,
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <p className="text-xs text-foreground font-medium leading-tight max-w-[72px]">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight max-w-[72px]">
                      {member.role}
                    </p>
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
      </div>
    </div>
  )
}
