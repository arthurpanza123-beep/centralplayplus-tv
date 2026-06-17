'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { getAccessToken, getDeviceKey } from '@/lib/activation'
import type { Channel as ApiChannel, CatalogCounts, CatalogItem, Category, HomeResponse, StreamQuality } from '@/lib/types/tv'
import type { Channel, KidsItem, Movie, Series, User } from '@/lib/types'

type PageState = {
  page: number
  hasMore: boolean
  total: number
  loading: boolean
}

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
  counts?: CatalogCounts
  moviePage: PageState
  seriesPage: PageState
  channelPage: PageState
  loadMoreMovies: () => Promise<void>
  loadMoreSeries: () => Promise<void>
  loadMoreChannels: () => Promise<void>
  refresh: () => Promise<void>
}

const TvCatalogContext = createContext<TvCatalogContextValue | null>(null)

const PAGE_SIZE = {
  channels: 200,
  movies: 120,
  series: 120,
}

const EMPTY_PAGE: PageState = { page: 0, hasMore: false, total: 0, loading: false }

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

function quality(value?: StreamQuality): 'HD' | '4K' | 'SD' {
  if (value === '4K') return '4K'
  if (value === 'SD') return 'SD'
  return 'HD'
}

function rating(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.min(value, 10) : 8.5
}

function imageFromItem(item: CatalogItem) {
  return item.poster || item.image || item.cover_big || item.cover || item.movie_image || item.series_image || item.stream_icon || ''
}

function movieFromItem(item: CatalogItem, index: number): Movie {
  const title = item.title || item.name || 'Filme'
  return {
    id: item.id,
    title,
    poster: imageFromItem(item),
    year: item.year || new Date().getFullYear(),
    duration: 'Sob demanda',
    genre: item.genre || item.category || 'Filmes',
    rating: rating(item.rating),
    quality: quality(item.quality),
    description: `${title} disponível no catálogo Central Play Plus.`,
    cast: [],
    director: 'Central Play Plus',
    colorFrom: colorFromText(title),
    colorTo: colorFromText(`${title}-${index}`),
    type: 'movie',
  }
}

function seriesFromItem(item: CatalogItem, index: number): Series {
  const title = item.title || item.name || 'Série'
  return {
    id: item.id,
    title,
    poster: imageFromItem(item),
    year: item.year || new Date().getFullYear(),
    seasons: 1,
    genre: item.genre || item.category || 'Séries',
    rating: rating(item.rating),
    quality: quality(item.quality),
    description: `${title} disponível no catálogo Central Play Plus.`,
    cast: [],
    creator: 'Central Play Plus',
    colorFrom: colorFromText(title),
    colorTo: colorFromText(`${title}-${index}`),
    type: 'series',
  }
}

function channelFromApi(channel: ApiChannel, index: number): Channel {
  const logo = channel.logo || channel.image || channel.stream_icon || ''
  return {
    id: channel.id,
    number: index + 1,
    name: channel.name,
    category: channel.category || 'Outros',
    logo,
    currentProgram: 'Ao vivo agora',
    programs: [
      { time: 'Agora', endTime: '', title: 'Programação ao vivo', isLive: true },
      { time: 'A seguir', endTime: '', title: 'Programação do canal' },
    ],
    logoColor: colorFromText(channel.name),
    logoText: channel.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CP',
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

type PageResponse<T> = {
  items: T[]
  page: number
  total: number
  has_more: boolean
  counts?: CatalogCounts
}

function defaultUser(): User {
  return {
    name: 'Central Play Plus',
    email: '',
    plan: 'Central Play Plus',
    validity: '31/12/2026',
    deviceCode: getDeviceKey(),
    notifications: true,
    autoplay: true,
    parentalControl: '12 anos',
    language: 'Português (Brasil)',
    videoQuality: 'Automático',
    connectedDevices: 1,
    appVersion: '1.4.0',
  }
}

export function TvCatalogProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [counts, setCounts] = useState<CatalogCounts | undefined>()
  const [categories, setCategories] = useState<Category[]>([])
  const [moviePage, setMoviePage] = useState<PageState>(EMPTY_PAGE)
  const [seriesPage, setSeriesPage] = useState<PageState>(EMPTY_PAGE)
  const [channelPage, setChannelPage] = useState<PageState>(EMPTY_PAGE)

  const loadChannelsPage = useCallback(async (page: number, replace = false) => {
    setChannelPage((state) => ({ ...state, loading: true }))
    const data = await apiJson<PageResponse<ApiChannel>>(`/api/tv/channels?page=${page}&limit=${PAGE_SIZE.channels}`)
    setChannels((current) => replace ? data.items.map(channelFromApi) : [...current, ...data.items.map((item, index) => channelFromApi(item, current.length + index))])
    setCounts(data.counts)
    setChannelPage({ page: data.page, hasMore: data.has_more, total: data.total, loading: false })
  }, [])

  const loadMoviesPage = useCallback(async (page: number, replace = false) => {
    setMoviePage((state) => ({ ...state, loading: true }))
    const data = await apiJson<PageResponse<CatalogItem>>(`/api/tv/movies?page=${page}&limit=${PAGE_SIZE.movies}`)
    setMovies((current) => replace ? data.items.map(movieFromItem) : [...current, ...data.items.map((item, index) => movieFromItem(item, current.length + index))])
    setCounts(data.counts)
    setMoviePage({ page: data.page, hasMore: data.has_more, total: data.total, loading: false })
  }, [])

  const loadSeriesPage = useCallback(async (page: number, replace = false) => {
    setSeriesPage((state) => ({ ...state, loading: true }))
    const data = await apiJson<PageResponse<CatalogItem>>(`/api/tv/series?page=${page}&limit=${PAGE_SIZE.series}`)
    setSeries((current) => replace ? data.items.map(seriesFromItem) : [...current, ...data.items.map((item, index) => seriesFromItem(item, current.length + index))])
    setCounts(data.counts)
    setSeriesPage({ page: data.page, hasMore: data.has_more, total: data.total, loading: false })
  }, [])

  const loadMoreChannels = useCallback(async () => {
    if (channelPage.loading || !channelPage.hasMore) return
    await loadChannelsPage(channelPage.page + 1)
  }, [channelPage, loadChannelsPage])

  const loadMoreMovies = useCallback(async () => {
    if (moviePage.loading || !moviePage.hasMore) return
    await loadMoviesPage(moviePage.page + 1)
  }, [moviePage, loadMoviesPage])

  const loadMoreSeries = useCallback(async () => {
    if (seriesPage.loading || !seriesPage.hasMore) return
    await loadSeriesPage(seriesPage.page + 1)
  }, [seriesPage, loadSeriesPage])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [home, allCategories] = await Promise.all([
        apiJson<HomeResponse>('/api/tv/home'),
        apiJson<Category[]>('/api/tv/categories'),
      ])
      setCounts(home.counts)
      setCategories(allCategories)
      await Promise.all([
        loadChannelsPage(1, true),
        loadMoviesPage(1, true),
        loadSeriesPage(1, true),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Catálogo indisponível.')
      setMovies([])
      setSeries([])
      setChannels([])
      setMoviePage(EMPTY_PAGE)
      setSeriesPage(EMPTY_PAGE)
      setChannelPage(EMPTY_PAGE)
    } finally {
      setLoading(false)
    }
  }, [loadChannelsPage, loadMoviesPage, loadSeriesPage])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo<TvCatalogContextValue>(() => {
    const movieCats = categories.filter((item) => item.type === 'vod' || item.type === 'movie').map((item) => item.name)
    const seriesCats = categories.filter((item) => item.type === 'series').map((item) => item.name)
    const channelCats = categories.filter((item) => item.type === 'live').map((item) => item.name)
    return {
      loading,
      error,
      movies,
      series,
      channels,
      kidsItems: [],
      user: defaultUser(),
      movieCategories: ['Todos', ...unique(movieCats.length ? movieCats : movies.map((item) => item.genre))],
      seriesCategories: ['Todos', ...unique(seriesCats.length ? seriesCats : series.map((item) => item.genre))],
      channelCategories: ['Todos', ...unique(channelCats.length ? channelCats : channels.map((item) => item.category))],
      counts,
      moviePage,
      seriesPage,
      channelPage,
      loadMoreMovies,
      loadMoreSeries,
      loadMoreChannels,
      refresh,
    }
  }, [loading, error, movies, series, channels, categories, counts, moviePage, seriesPage, channelPage, loadMoreMovies, loadMoreSeries, loadMoreChannels, refresh])

  return <TvCatalogContext.Provider value={value}>{children}</TvCatalogContext.Provider>
}

export function useTvCatalog() {
  const value = useContext(TvCatalogContext)
  if (!value) {
    return {
      loading: false,
      error: 'Catálogo real indisponível.',
      movies: [],
      series: [],
      channels: [],
      kidsItems: [],
      user: defaultUser(),
      movieCategories: ['Todos'],
      seriesCategories: ['Todos'],
      channelCategories: ['Todos'],
      moviePage: EMPTY_PAGE,
      seriesPage: EMPTY_PAGE,
      channelPage: EMPTY_PAGE,
      loadMoreMovies: async () => undefined,
      loadMoreSeries: async () => undefined,
      loadMoreChannels: async () => undefined,
      refresh: async () => undefined,
    } satisfies TvCatalogContextValue
  }
  return value
}
