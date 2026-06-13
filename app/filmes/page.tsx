'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { TVLayout } from '@/components/tv/tv-layout'
import { CategorySidebar } from '@/components/tv/category-sidebar'
import { ContentCard } from '@/components/tv/content-card'
import { ContentModal } from '@/components/tv/content-modal'
import { MOVIES, MOVIE_CATEGORIES } from '@/lib/data'
import type { Movie, Series } from '@/lib/types'

export default function FilmesPage() {
  const [category, setCategory] = useState(MOVIE_CATEGORIES[0])
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const [search, setSearch] = useState('')

  const filtered = MOVIES.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase())
    const matchCategory =
      category === 'Lançamentos' ||
      category === 'Em alta' ||
      m.genre.toLowerCase() === category.toLowerCase() ||
      (category === 'Infantil' && m.rating <= 10)
    return matchSearch && matchCategory
  })

  return (
    <TVLayout
      title="Filmes"
      headerRight={
        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar filmes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-64"
          />
        </div>
      }
    >
      <div className="flex h-full">
        <CategorySidebar
          categories={MOVIE_CATEGORIES}
          selected={category}
          onSelect={setCategory}
        />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm font-semibold text-primary mb-4">{category}</p>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-6 gap-3">
              {filtered.map((movie) => (
                <ContentCard key={movie.id} item={movie} onClick={setSelected} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Nenhum filme encontrado.
            </div>
          )}
        </div>
      </div>

      <ContentModal item={selected} onClose={() => setSelected(null)} />
    </TVLayout>
  )
}
