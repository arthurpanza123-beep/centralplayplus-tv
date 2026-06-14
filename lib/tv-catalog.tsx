'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { getAccessToken, getDeviceKey } from '@/lib/activation'
import { CHANNELS as MOCK_CHANNELS, KIDS_ITEMS, MOVIES as MOCK_MOVIES, SERIES as MOCK_SERIES, USER as MOCK_USER } from '@/lib/data'
import type { Channel as ApiChannel, CatalogItem, HomeResponse } from '@/lib/types/tv'
import type { Channel, KidsItem, Movie, Series, User } from '@/lib/types'

type TvCatalogContextValue = {
  loading: boolean
  error: string
  movies: Movie[]
  series: Series[]
  channels: Channel[]
  kidsItems: KidsItem[]
  user: User
  movieCategories: string[]
  seriesCategories: string[]
  channelCategories: string[]
  refresh: () => Promise<void>
}

const TvCatalogContext = createContext<TvCatalogContextValue | null>(null)

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

async function apiJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: authHeaders(), cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data as T
}

function colorFromText(text: string) {
  const colors = ['#2563eb', '#0891b2', '#7c3aed', '#dc2626', '#16a34a', '#ea580c', '#be123c', '#0f766e']
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return colors[hash % colors.length]
}

function quality(value?: string): 'HD' | '4K' | 'SD' {
  if (value === '4K') return '4K'
  if (value === 'SD') return 'SD'
  return 'HD'
}

function movieFromItem(item: CatalogItem, index: number): Movie {
  return {
    id: item.id,
    title: item.title,
    poster: item.poster,
    year: item.year || new Date().getFullYear(),
    duration: 'Sob demanda',
    genre: item.genre || 'Filmes',
    rating: item.rating || 8.5,
    quality: quality(item.quality),
    description: `${item.title} disponível no catálogo Central Play Plus.`,
    cast: [],
    director: 'Central Play Plus',
    colorFrom: colorFromText(item.title),
    colorTo: colorFromText(`${item.title}-${index}`),
    type: 'movie',
  }
}

function seriesFromItem(item: CatalogItem, index: number): Series {
  return {
    id: item.id,
    title: item.title,
    poster: item.poster,
    year: item.year || new Date().getFullYear(),
    seasons: 1,
    genre: item.genre || 'Séries',
    rating: item.rating || 8.5,
    quality: quality(item.quality),
    description: `${item.title} disponível no catálogo Central Play Plus.`,
    cast: [],
    creator: 'Central Play Plus',
    colorFrom: colorFromText(item.title),
    colorTo: colorFromText(`${item.title}-${index}`),
    type: 'series',
  }
}

function channelFromApi(channel: ApiChannel, index: number): Channel {
  return {
    id: channel.id,
    number: index + 1,
    name: channel.name,
    category: channel.category || 'Outros',
    logo: channel.logo,
    currentProgram: 'Ao vivo agora',
    programs: [
      { time: 'Agora', endTime: '', title: 'Programação ao vivo', isLive: true },
      { time: 'A seguir', endTime: '', title: 'Próximo programa' },
    ],
    logoColor: colorFromText(channel.name),
    logoText: channel.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CP',
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

async function loadRealCatalog() {
  const [home, channelsPage] = await Promise.all([
    apiJson<HomeResponse>('/api/tv/home'),
    apiJson<{ items: ApiChannel[] }>('/api/tv/channels?page_size=200'),
  ])
  const movieItems = home.rows.filter((row) => row.type === 'vod').flatMap((row) => row.items)
  const seriesItems = home.rows.filter((row) => row.type === 'series').flatMap((row) => row.items)
  const movies = movieItems.map(movieFromItem)
  const series = seriesItems.map(seriesFromItem)
  const channels = channelsPage.items.map(channelFromApi)
  return { movies, series, channels }
}

export function TvCatalogProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [channels, setChannels] = useState<Channel[]>([])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const real = await loadRealCatalog()
      setMovies(real.movies)
      setSeries(real.series)
      setChannels(real.channels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Catálogo indisponível.')
      setMovies([])
      setSeries([])
      setChannels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const value = useMemo<TvCatalogContextValue>(() => ({
    loading,
    error,
    movies,
    series,
    channels,
    kidsItems: KIDS_ITEMS,
    user: {
      ...MOCK_USER,
      deviceCode: getDeviceKey(),
      plan: 'Central Play Plus',
    },
    movieCategories: ['Todos', ...unique(movies.map((item) => item.genre))],
    seriesCategories: ['Todos', ...unique(series.map((item) => item.genre))],
    channelCategories: ['Todos', ...unique(channels.map((item) => item.category))],
    refresh,
  }), [loading, error, movies, series, channels])

  return <TvCatalogContext.Provider value={value}>{children}</TvCatalogContext.Provider>
}

export function useTvCatalog() {
  const value = useContext(TvCatalogContext)
  if (!value) {
    return {
      loading: false,
      error: '',
      movies: MOCK_MOVIES,
      series: MOCK_SERIES,
      channels: MOCK_CHANNELS,
      kidsItems: KIDS_ITEMS,
      user: MOCK_USER,
      movieCategories: ['Todos'],
      seriesCategories: ['Todos'],
      channelCategories: ['Todos'],
      refresh: async () => undefined,
    } satisfies TvCatalogContextValue
  }
  return value
}
