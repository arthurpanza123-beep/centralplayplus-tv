import { memo } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
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
        'group/card relative flex flex-col w-full rounded-lg bg-card outline-none',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:scale-[1.09] hover:z-20 focus:scale-[1.09] focus:z-20',
        'shadow-md',
        // Premium selection contour: thick bright ring + offset + glow (fires on focus AND hover, for TV remotes + mouse)
        'ring-0 ring-white ring-offset-2 ring-offset-background',
        'hover:ring-4 focus:ring-4',
        'hover:shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_30px_rgba(255,255,255,0.18)]',
        'focus:shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_30px_rgba(255,255,255,0.18)]',
        className
      )}
      aria-label={`Abrir detalhes de ${item.title}`}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-lg">
        {/* Real poster art */}
        <Image
          src={item.poster || `/posters/${item.id}.png`}
          alt={item.title}
          fill
          sizes="(max-width: 1920px) 16vw, 220px"
          className="object-cover"
        />

        {/* Quality badge */}
        <span className="absolute top-2 right-2 z-20 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-sm tracking-wide">
          {item.quality}
        </span>

        {/* Hover/focus reveal overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-3 bg-gradient-to-t from-black via-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          <p className="text-balance text-white font-semibold text-sm leading-tight text-left">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
            <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
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
