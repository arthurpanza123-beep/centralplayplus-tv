'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ArrowLeft, Play, Plus, Star, Share2 } from 'lucide-react'
import { MOVIES, SERIES } from '@/lib/data'
import type { Movie, Series } from '@/lib/types'
import { ReportProblem } from '@/components/tv/report-problem'

interface ContentDetailProps {
  item: Movie | Series | null
  onClose: () => void
}

const POOL: (Movie | Series)[] = [...MOVIES, ...SERIES]

export function ContentDetail({ item, onClose }: ContentDetailProps) {
  const watchBtnRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Internal "current" item so clicking a recommendation swaps content in place.
  const [current, setCurrent] = useState<Movie | Series | null>(item)

  useEffect(() => {
    setCurrent(item)
  }, [item])

  // Focus "Assistir" and reset scroll whenever the shown title changes.
  useEffect(() => {
    if (!current) return
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    const id = window.setTimeout(() => watchBtnRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [current])

  // Escape / Back closes. Capture phase so it runs before global nav.
  useEffect(() => {
    if (!current) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [current, onClose])

  // Recommendations: same genre first, then fill with others. Excludes current.
  const recommendations = useMemo(() => {
    if (!current) return []
    const sameGenre = POOL.filter((i) => i.id !== current.id && i.genre === current.genre)
    const others = POOL.filter((i) => i.id !== current.id && i.genre !== current.genre)
    return [...sameGenre, ...others].slice(0, 12)
  }, [current])

  if (!current || typeof document === 'undefined') return null

  const isMovie = current.type === 'movie'

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-background animate-cp-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${current.title}`}
    >
      <div ref={scrollRef} className="h-full w-full overflow-y-auto scrollbar-none">
        {/* ── Cinematic hero ── */}
        <div className="relative w-full h-[62vh] min-h-[420px]">
          <Image
            src={`/posters/${current.id}.png`}
            alt={current.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
          {/* Gradients: fade to background at bottom and from the left for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute top-6 left-6 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/70 outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {/* Title + actions over hero */}
          <div className="absolute bottom-0 left-0 right-0 px-10 lg:px-16 pb-10 max-w-4xl">
            <h1 className="text-5xl lg:text-6xl font-black text-white text-balance leading-[0.95] tracking-tight drop-shadow-2xl">
              {current.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-5 text-sm">
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                {current.rating}
              </span>
              <span className="text-white/80">{current.year}</span>
              <span className="text-white/80">
                {isMovie
                  ? (current as Movie).duration
                  : `${(current as Series).seasons} ${(current as Series).seasons === 1 ? 'temporada' : 'temporadas'}`}
              </span>
              <span className="text-white/80">{current.genre}</span>
              <span className="px-2 py-0.5 rounded border border-white/30 text-xs text-white font-semibold">
                {current.quality}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                ref={watchBtnRef}
                className="flex items-center gap-2.5 pl-6 pr-7 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-xl shadow-primary/40 transition-all hover:bg-primary/90 hover:scale-[1.03] outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
              >
                <Play className="w-5 h-5 fill-current" />
                Assistir agora
              </button>
              <button
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/25 bg-white/10 text-white text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Plus className="w-5 h-5" />
                Minha Lista
              </button>
              <button
                className="flex items-center justify-center w-12 h-12 rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Compartilhar"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <ReportProblem
                kind={isMovie ? 'movie' : 'series'}
                contentId={current.id}
                contentTitle={current.title}
                category={current.genre}
              />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pb-16 -mt-2">
          <p className="px-10 lg:px-16 text-base text-foreground/90 leading-relaxed max-w-3xl">
            {current.description}
          </p>

          {/* Recommendations — single 16:9 row that scrolls sideways infinitely */}
          <div className="mt-12">
            <h2 className="px-10 lg:px-16 text-xl font-bold text-foreground mb-4">Você também pode gostar</h2>
            <div className="flex gap-4 overflow-x-auto px-10 lg:px-16 py-3 scrollbar-none">
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => setCurrent(rec)}
                  className="group/rec relative shrink-0 w-[300px] aspect-video rounded-xl overflow-hidden bg-card outline-none transition-transform duration-300 hover:scale-[1.04] focus-visible:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                  aria-label={`Ver ${rec.title}`}
                >
                  <Image
                    src={`/posters/${rec.id}.png`}
                    alt={rec.title}
                    fill
                    sizes="300px"
                    className="object-cover object-top"
                  />
                  <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-sm tracking-wide">
                    {rec.quality}
                  </span>
                  <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/90 via-black/25 to-transparent">
                    <div className="flex items-center gap-2 text-white">
                      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover/rec:opacity-100 group-focus-visible/rec:opacity-100 shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </span>
                      <p className="text-left font-semibold text-sm leading-tight text-balance">{rec.title}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
