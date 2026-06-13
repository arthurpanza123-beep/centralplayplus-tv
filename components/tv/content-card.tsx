import { memo } from 'react'
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
        'group relative flex flex-col rounded-2xl overflow-hidden border border-border transition-all duration-200 hover:border-primary/50 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/15 focus-visible:outline-2 focus-visible:outline-primary shadow-sm',
        className
      )}
      aria-label={`Abrir detalhes de ${item.title}`}
    >
      <div
        className="relative w-full aspect-[2/3] flex items-end p-3"
        style={{ background: item.gradient ?? `linear-gradient(160deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)` }}
      >
        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm">
          {item.quality}
        </span>
        <p className="text-balance text-white font-bold text-sm leading-tight text-left drop-shadow-md uppercase tracking-wide">
          {item.title}
        </p>
      </div>
    </button>
  )
})
