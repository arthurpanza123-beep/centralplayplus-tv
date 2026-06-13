'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { TVLayout } from '@/components/tv/tv-layout'
import { CategorySidebar } from '@/components/tv/category-sidebar'
import { ContentCard } from '@/components/tv/content-card'
import { ContentModal } from '@/components/tv/content-modal'
import { SERIES, SERIES_CATEGORIES } from '@/lib/data'
import type { Movie, Series } from '@/lib/types'

export default function SeriesPage() {
  const [category, setCategory] = useState(SERIES_CATEGORIES[0])
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return SERIES.filter((s) => {
      const matchSearch = !q || s.title.toLowerCase().includes(q)
      const matchCategory =
        category === 'Lançamentos' ||
        category === 'Em alta' ||
        s.genre.toLowerCase() === category.toLowerCase() ||
        (category === 'Infantil' && s.rating <= 10)
      return matchSearch && matchCategory
    })
  }, [search, category])

  const handleSelect = useCallback((item: Movie | Series) => setSelected(item), [])
  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <TVLayout
      title="Séries"
      headerRight={
        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar séries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-64"
          />
        </div>
      }
    >
      <div className="flex h-full">
        <CategorySidebar
          categories={SERIES_CATEGORIES}
          selected={category}
          onSelect={setCategory}
        />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm font-semibold text-primary mb-4">{category}</p>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-6 gap-3">
              {filtered.map((serie) => (
                <ContentCard key={serie.id} item={serie} onClick={handleSelect} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Nenhuma série encontrada.
            </div>
          )}
        </div>
      </div>

      <ContentModal item={selected} onClose={handleClose} />
    </TVLayout>
  )
}
