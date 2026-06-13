import { cn } from '@/lib/utils'
import type { Movie, Series } from '@/lib/types'

interface ContentCardProps {
  item: Movie | Series
  onClick: (item: Movie | Series) => void
  className?: string
}

export function ContentCard({ item, onClick, className }: ContentCardProps) {
  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden border border-border/30 transition-all duration-200 hover:border-primary/60 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/40 focus-visible:outline-2 focus-visible:outline-primary',
        className
      )}
      aria-label={`Abrir detalhes de ${item.title}`}
    >
      {/* Poster area */}
      <div
        className="relative w-full aspect-[2/3] flex items-end p-3"
        style={{
          background: `linear-gradient(160deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)`,
        }}
      >
        {/* Quality badge */}
        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm">
          {item.quality}
        </span>

        {/* Title overlay */}
        <p className="text-balance text-white font-bold text-sm leading-tight text-left drop-shadow-md uppercase tracking-wide">
          {item.title}
        </p>
      </div>
    </button>
  )
}
