import { memo } from 'react'
import { Play, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Movie, Series } from '@/lib/types'

interface ContentCardProps {
  item: Movie | Series
  onClick: (item: Movie | Series) => void
  className?: string
}

// Memoized: only re-renders if the item reference or onClick changes
export const ContentCard = memo(function ContentCard({ item, onClick, className }: ContentCardProps) {
  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        'group/card relative flex flex-col rounded-2xl overflow-hidden outline-none',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:scale-[1.05] hover:z-10 focus-visible:scale-[1.05] focus-visible:z-10',
        'shadow-md hover:shadow-2xl hover:shadow-primary/25',
        'focus-visible:ring-4 focus-visible:ring-primary/70 focus-visible:shadow-2xl focus-visible:shadow-primary/30',
        className
      )}
      aria-label={`Abrir detalhes de ${item.title}`}
    >
      {/* Poster art */}
      <div
        className="relative w-full aspect-[2/3] flex items-end"
        style={{ background: item.gradient ?? `linear-gradient(160deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)` }}
      >
        {/* Quality badge */}
        <span className="absolute top-2 right-2 z-20 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/25 bg-black/50 text-white/90 backdrop-blur-sm tracking-wide">
          {item.quality}
        </span>

        {/* Base title — always visible, fades out on hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 group-hover/card:opacity-0 group-focus-visible/card:opacity-0">
          <p className="text-balance text-white font-bold text-sm leading-tight text-left drop-shadow-md uppercase tracking-wide">
            {item.title}
          </p>
        </div>

        {/* Hover/focus reveal overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-3 bg-gradient-to-t from-black/90 via-black/55 to-black/20 opacity-0 translate-y-1 transition-all duration-300 group-hover/card:opacity-100 group-hover/card:translate-y-0 group-focus-visible/card:opacity-100 group-focus-visible/card:translate-y-0">
          {/* Play affordance */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/95 flex items-center justify-center shadow-lg shadow-primary/40 scale-75 transition-transform duration-300 group-hover/card:scale-100 group-focus-visible/card:scale-100">
            <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
          </div>

          {/* Metadata */}
          <p className="text-balance text-white font-bold text-sm leading-tight text-left uppercase tracking-wide">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/80">
            <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
              <Star className="w-3 h-3 fill-current" />
              {item.rating}
            </span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/40" />
            <span>{item.year}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/40" />
            <span className="truncate">{item.genre}</span>
          </div>
        </div>
      </div>
    </button>
  )
})
