'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { clearDeviceActivation, getAccessToken, getDeviceKey, getRefreshToken, markDeviceActivated } from '@/lib/activation'
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

async function renewFromStatus(): Promise<string> {
  const deviceKey = getDeviceKey()
  if (!deviceKey || deviceKey === '----' || deviceKey === 'CP-000000') return ''
  const res = await fetch(`/api/tv/status/${encodeURIComponent(deviceKey)}`, { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.status !== 'active' || !data?.access_token) return ''
  markDeviceActivated({ access_token: data.access_token, refresh_token: data.refresh_token })
  return data.access_token
}

async function renewFromRefreshToken(): Promise<string> {
  const deviceKey = getDeviceKey()
  const refreshToken = getRefreshToken()
  if (!deviceKey || !refreshToken) return ''
  const res = await fetch('/api/tv/activate-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ device_key: deviceKey, refresh_token: refreshToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.access_token) return ''
  markDeviceActivated({ access_token: data.access_token, refresh_token: data.refresh_token })
  return data.access_token
}

async function ensureAccessToken(): Promise<string> {
  return getAccessToken() || await renewFromStatus()
}

function authHeaders(token: string): HeadersInit {
  return token ? { authorization: `Bearer ${token}` } : {}
}

async function apiJson<T>(path: string): Promise<T> {
  let token = await ensureAccessToken()
  let res = await fetch(path, { headers: authHeaders(token), cache: 'no-store' })
  if (res.status === 401) {
    token = await renewFromRefreshToken() || await renewFromStatus()
    res = await fetch(path, { headers: authHeaders(token), cache: 'no-store' })
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 || res.status === 403) {
    clearDeviceActivation()
    window.dispatchEvent(new Event('cpp-session-expired'))
  }
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
  items?: T[]
  channels?: T[]
  movies?: T[]
  series?: T[]
  page: number
  total: number
  has_more: boolean
  counts?: CatalogCounts
}

function pageItems<T>(data: PageResponse<T>, key: 'channels' | 'movies' | 'series'): T[] {
  return data.items || data[key] || []
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
    try {
      const data = await apiJson<PageResponse<ApiChannel>>(`/api/tv/channels?page=${page}&limit=${PAGE_SIZE.channels}`)
      const items = pageItems(data, 'channels')
      setChannels((current) => replace ? items.map(channelFromApi) : [...current, ...items.map((item, index) => channelFromApi(item, current.length + index))])
      setCounts((current) => data.counts || current)
      setChannelPage({ page: data.page, hasMore: data.has_more, total: data.total, loading: false })
    } catch (error) {
      setChannelPage((state) => ({ ...state, loading: false }))
      throw error
    }
  }, [])

  const loadMoviesPage = useCallback(async (page: number, replace = false) => {
    setMoviePage((state) => ({ ...state, loading: true }))
    try {
      const data = await apiJson<PageResponse<CatalogItem>>(`/api/tv/movies?page=${page}&limit=${PAGE_SIZE.movies}`)
      const items = pageItems(data, 'movies')
      setMovies((current) => replace ? items.map(movieFromItem) : [...current, ...items.map((item, index) => movieFromItem(item, current.length + index))])
      setCounts((current) => data.counts || current)
      setMoviePage({ page: data.page, hasMore: data.has_more, total: data.total, loading: false })
    } catch (error) {
      setMoviePage((state) => ({ ...state, loading: false }))
      throw error
    }
  }, [])

  const loadSeriesPage = useCallback(async (page: number, replace = false) => {
    setSeriesPage((state) => ({ ...state, loading: true }))
    try {
      const data = await apiJson<PageResponse<CatalogItem>>(`/api/tv/series?page=${page}&limit=${PAGE_SIZE.series}`)
      const items = pageItems(data, 'series')
      setSeries((current) => replace ? items.map(seriesFromItem) : [...current, ...items.map((item, index) => seriesFromItem(item, current.length + index))])
      setCounts((current) => data.counts || current)
      setSeriesPage({ page: data.page, hasMore: data.has_more, total: data.total, loading: false })
    } catch (error) {
      setSeriesPage((state) => ({ ...state, loading: false }))
      throw error
    }
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
    const catalogErrors: string[] = []
    const home = await apiJson<HomeResponse>('/api/tv/home').catch((err) => {
      catalogErrors.push(err instanceof Error ? err.message : 'Home indisponível.')
      return null
    })
    const allCategories = await apiJson<Category[]>('/api/tv/categories').catch(() => [])
    if (home?.counts) {
      setCounts(home.counts)
    }
    setCategories(allCategories)
    const results = await Promise.allSettled([
      loadChannelsPage(1, true),
      loadMoviesPage(1, true),
      loadSeriesPage(1, true),
    ])
    results.forEach((result) => {
      if (result.status === 'rejected') {
        catalogErrors.push(result.reason instanceof Error ? result.reason.message : 'Seção indisponível.')
      }
    })
    setLoading(false)
    if (results.every((result) => result.status === 'rejected')) {
      setError(catalogErrors[0] || 'Catálogo indisponível.')
      setMoviePage(EMPTY_PAGE)
      setSeriesPage(EMPTY_PAGE)
      setChannelPage(EMPTY_PAGE)
      return
    }
    setError('')
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
