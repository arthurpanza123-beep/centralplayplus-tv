import crypto from 'crypto'

import { cached } from '@/lib/cache/catalog-cache'
import { sql, isDatabaseConfigured } from '@/lib/db/client'
import { getProviderAdapter } from '@/lib/providers/provider-adapter'
import { normalizeXtreamBaseUrl } from '@/lib/providers/xtream-url'
import { issueImageToken } from '@/lib/security/tokens'
import type { ProviderAccount, ProviderCredentials, RawCategory, RawSeries, RawStream } from '@/lib/providers/types'
import type { CatalogCounts, CatalogItem, Category, Channel, ChannelVariantPublic, ContentType, HomeResponse, StreamQuality } from '@/lib/types/tv'
import type { StreamVariant } from '@/lib/streaming/variant-health'

export type CatalogPayload = {
  serverId: string
  version: string
  categories: Category[]
  channels: Channel[]
  movies: CatalogItem[]
  series: CatalogItem[]
  counts: CatalogCounts
  generatedAt: string
  loadTimeMs?: number
}

type ProviderServerRow = {
  id: string
  name: string
  kind: ProviderCredentials['kind']
  base_url: string
  username: string | null
  password: string | null
  api_key: string | null
  m3u_url: string | null
}

type ChannelRow = {
  id: string
  name: string
  logo: string | null
  category: string | null
  type: ContentType
}

type VariantRow = {
  id: string
  channel_id: string
  quality: StreamQuality
  provider_ref: string
  health_score: number
  status: string
}

type CatalogCacheRow = {
  payload: CatalogItem[] | null
  version: string
}

const CATALOG_VERSION = 'real-v4'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const IMAGE_PROXY_PREFIX = '/api/tv/image'

export function isCatalogProviderConfigured() {
  return Boolean(process.env.XTREAM_BASE_URL && process.env.XTREAM_USERNAME && process.env.XTREAM_PASSWORD)
}

export function slugId(prefix: string, text: string) {
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || prefix
  const hash = crypto.createHash('sha1').update(`${prefix}:${text}`).digest('hex').slice(0, 8)
  return `${prefix}-${slug}-${hash}`
}

async function getOrCreateYellowBoxCatalogServer(): Promise<ProviderServerRow> {
  if (!isDatabaseConfigured) {
    return {
      id: 'yellowbox',
      name: 'Yellow Box',
      kind: 'xtream',
      base_url: normalizeXtreamBaseUrl(process.env.YELLOW_BOX_XTREAM_URL) || '',
      username: process.env.YELLOW_BOX_XTREAM_USER || null,
      password: process.env.YELLOW_BOX_XTREAM_PASS || null,
      api_key: null,
      m3u_url: null,
    }
  }

  const existing = (await sql`
    select id, name, kind, base_url, username, password, api_key, m3u_url
    from provider_servers
    where name = 'Yellow Box'
      and kind = 'xtream'
    order by created_at asc
    limit 1
  `) as unknown as ProviderServerRow[]

  if (existing[0]) return existing[0]

  const inserted = (await sql`
    insert into provider_servers (name, kind, base_url, status)
    values ('Yellow Box', 'xtream', ${normalizeXtreamBaseUrl(process.env.YELLOW_BOX_XTREAM_URL) || ''}, 'active')
    returning id, name, kind, base_url, username, password, api_key, m3u_url
  `) as unknown as ProviderServerRow[]

  return inserted[0]
}

export async function getDefaultServer(): Promise<ProviderServerRow> {
  if (isDatabaseConfigured) {
    const rows = (await sql`
      select id, name, kind, base_url, username, password, api_key, m3u_url
      from provider_servers
      where status = 'active'
      order by created_at asc
      limit 1
    `) as unknown as ProviderServerRow[]
    // Only use DB row if it has a valid base_url (skip yellowbox placeholder rows)
    if (rows[0] && rows[0].base_url) return rows[0]
  }

  // Yellow Box configured: use DB-backed UUID server in production
  if (process.env.YELLOW_BOX_FULL_API_URL && process.env.YELLOW_BOX_XTREAM_URL) {
    return getOrCreateYellowBoxCatalogServer()
  }

  if (!isCatalogProviderConfigured()) {
    // Allow placeholder operation with Yellow Box when only its provisioning URL is set.
    // In DB mode this must still return a real UUID from provider_servers.
    if (process.env.YELLOW_BOX_FULL_API_URL) {
      return getOrCreateYellowBoxCatalogServer()
    }
    // Neither Xtream nor Yellow Box configured
    throw new Error('XTREAM_BASE_URL ausente. Defina XTREAM_BASE_URL, XTREAM_USERNAME e XTREAM_PASSWORD.')
  }

  // Xtream env configured – return its server info
  return {
    id: process.env.XTREAM_SERVER_ID || 'env-xtream',
    name: process.env.XTREAM_SERVER_NAME || 'Xtream Principal',
    kind: 'xtream',
    base_url: normalizeXtreamBaseUrl(process.env.XTREAM_BASE_URL)!,
    username: process.env.XTREAM_USERNAME!,
    password: process.env.XTREAM_PASSWORD!,
    api_key: null,
    m3u_url: null,
  }
}

export function credentialsFromServer(server: ProviderServerRow): ProviderCredentials {
  return {
    server_id: server.id,
    kind: server.kind,
    base_url: server.base_url,
    username: server.username || undefined,
    password: server.password || undefined,
    api_key: server.api_key || undefined,
    m3u_url: server.m3u_url || undefined,
  }
}

export function providerAccountFromCredentials(credentials: ProviderCredentials, account?: Partial<ProviderAccount> | null): ProviderAccount {
  return {
    account_id: account?.account_id || credentials.username || credentials.server_id,
    username: account?.username || credentials.username || '',
    password: account?.password || credentials.password || '',
    expires_at: account?.expires_at || null,
    max_connections: account?.max_connections || 1,
    status: account?.status || 'active',
  }
}

function categoryName(categories: RawCategory[], ref: string, fallback = 'Outros') {
  return categories.find((item) => item.provider_ref === ref)?.name || fallback
}

function publicVariant(id: string, quality: StreamQuality): ChannelVariantPublic {
  return { id, quality }
}

async function tmdbPoster(title: string, type: 'movie' | 'series', year?: number): Promise<string | null> {
  const token = process.env.TMDB_READ_TOKEN
  const apiKey = process.env.TMDB_API_KEY
  if (!token && !apiKey) return null

  const params = new URLSearchParams({
    query: stripTitle(title),
    language: 'pt-BR',
    include_adult: 'false',
  })
  if (year) params.set(type === 'movie' ? 'year' : 'first_air_date_year', String(year))
  if (apiKey) params.set('api_key', apiKey)

  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const response = await fetch(`https://api.themoviedb.org/3/search/${endpoint}?${params.toString()}`, {
    headers: token ? { authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 * 7 },
  })
  if (!response.ok) return null
  const data = await response.json() as { results?: Array<{ poster_path?: string | null }> }
  const posterPath = data.results?.find((item) => item.poster_path)?.poster_path
  return posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null
}

function stripTitle(title: string) {
  return title
    .replace(/\b(4k|uhd|fhd|hd|sd|dual audio|dublado|legendado|h265|x265|1080p|720p)\b/gi, '')
    .replace(/\[[^\]]+\]|\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractYear(title: string) {
  const match = title.match(/\b(19\d{2}|20\d{2})\b/)
  return match ? Number(match[1]) : undefined
}

function ratingFromUnknown(value: unknown) {
  const n = Number(value)
  if (Number.isFinite(n) && n > 0) return Math.min(Math.round(n * 10) / 10, 10)
  return undefined
}

function catalogItemFromStream(stream: RawStream, categories: RawCategory[]): CatalogItem {
  const year = extractYear(stream.name)
  const image = pickCatalogImage(stream)
  return {
    id: slugId('vod', stream.provider_ref),
    name: stripTitle(stream.name),
    title: stripTitle(stream.name),
    poster: image,
    image,
    cover: image,
    cover_big: image,
    movie_image: image,
    stream_icon: image,
    type: 'movie',
    quality: stream.quality,
    year,
    rating: ratingFromUnknown((stream as RawStream & { rating?: unknown }).rating),
    category: categoryName(categories, stream.category_ref, 'Filmes'),
    category_id: stream.category_ref,
    genre: categoryName(categories, stream.category_ref, 'Filmes'),
  }
}

function catalogItemFromSeries(item: RawSeries, categories: RawCategory[]): CatalogItem {
  const year = extractYear(item.name)
  const image = pickCatalogImage(item)
  return {
    id: slugId('series', item.provider_ref),
    name: stripTitle(item.name),
    title: stripTitle(item.name),
    poster: image,
    image,
    cover: image,
    cover_big: image,
    series_image: image,
    type: 'series',
    quality: 'HD',
    year,
    rating: item.rating,
    category: categoryName(categories, item.category_ref, 'Séries'),
    category_id: item.category_ref,
    genre: categoryName(categories, item.category_ref, 'Séries'),
  }
}

export function pickCatalogImage(item: {
  image?: string
  logo?: string
  cover?: string
  cover_big?: string
  movie_image?: string
  series_image?: string
  stream_icon?: string
  image_candidates?: string[]
}) {
  return [
    item.image,
    item.logo,
    item.stream_icon,
    item.movie_image,
    item.cover_big,
    item.cover,
    item.series_image,
    ...(item.image_candidates || []),
  ].find((value) => typeof value === 'string' && /^https?:\/\//i.test(value)) || ''
}

function proxiedImage(src?: string) {
  if (!src || !/^https?:\/\//i.test(src)) return ''
  return `${IMAGE_PROXY_PREFIX}/${encodeURIComponent(issueImageToken({ src }))}`
}

function publicCatalogItem(item: CatalogItem): CatalogItem {
  const image = proxiedImage(pickCatalogImage(item)) || ''
  return {
    ...item,
    name: item.name || item.title,
    poster: image,
    image,
    cover: image,
    cover_big: image,
    movie_image: item.type === 'movie' || item.type === 'vod' ? image : undefined,
    series_image: item.type === 'series' ? image : undefined,
    stream_icon: image,
    category: item.genre,
  }
}

function publicChannel(channel: Channel): Channel {
  const image = proxiedImage(pickCatalogImage(channel)) || ''
  return {
    ...channel,
    logo: image,
    image,
    stream_icon: image,
  }
}

export function publicCatalog(catalog: CatalogPayload): CatalogPayload {
  return {
    ...catalog,
    channels: catalog.channels.map(publicChannel),
    movies: catalog.movies.map(publicCatalogItem),
    series: catalog.series.map(publicCatalogItem),
  }
}

async function enrichPosters(items: CatalogItem[], type: 'movie' | 'series') {
  const limited = items.slice(0, Number(process.env.TMDB_ENRICH_LIMIT || 80))
  const enriched = await Promise.all(limited.map(async (item) => {
    if (item.poster) return item
    const poster = await tmdbPoster(item.title, type, item.year)
    return { ...item, poster: poster || '' }
  }))
  return [...enriched, ...items.slice(limited.length)]
}

function catalogCounts(categories: Category[], channels: Channel[], movies: CatalogItem[], series: CatalogItem[]): CatalogCounts {
  return {
    total_live_channels: channels.length,
    total_movies: movies.length,
    total_series: series.length,
    total_live_categories: categories.filter((category) => category.type === 'live').length,
    total_vod_categories: categories.filter((category) => category.type === 'vod' || category.type === 'movie').length,
    total_series_categories: categories.filter((category) => category.type === 'series').length,
  }
}

function mapLiveChannels(liveCategories: RawCategory[], liveStreams: RawStream[]): { channels: Channel[]; variants: VariantRow[] } {
  const channels: Channel[] = []
  const variants: VariantRow[] = []
  for (const stream of liveStreams) {
    const channelId = slugId('ch', stream.provider_ref)
    const variantId = `${channelId}-1`
    channels.push({
      id: channelId,
      name: stream.name,
      logo: pickCatalogImage(stream),
      image: pickCatalogImage(stream),
      stream_icon: pickCatalogImage(stream),
      category: categoryName(liveCategories, stream.category_ref, 'Outros'),
      category_id: stream.category_ref,
      type: 'live',
      variants: [publicVariant(variantId, stream.quality || 'HD')],
    })
    variants.push({
      id: variantId,
      channel_id: channelId,
      quality: stream.quality || 'HD',
      provider_ref: stream.provider_ref,
      health_score: 100,
      status: 'active',
    })
  }

  return { channels, variants }
}

export async function syncCatalog(): Promise<CatalogPayload> {
  const startedAt = Date.now()
  const server = await getDefaultServer()
  const credentials = credentialsFromServer(server)

  // Yellowbox placeholder without real Xtream credentials: catalog unavailable
  if (!credentials.base_url) {
    throw new Error('XTREAM_BASE_URL ausente. Configure YELLOW_BOX_XTREAM_URL ou XTREAM_BASE_URL para usar o catálogo.')
  }

  const adapter = getProviderAdapter(credentials)

  const [liveCategories, liveStreams, vodCategories, vodStreams, seriesCategories, seriesRaw] = await Promise.all([
    adapter.getLiveCategories(),
    adapter.getLiveStreams(),
    adapter.getVodCategories(),
    adapter.getVodStreams(),
    adapter.getSeriesCategories(),
    adapter.getSeries(),
  ])

  const { channels, variants } = mapLiveChannels(liveCategories, liveStreams)
  const movies = await enrichPosters(vodStreams.map((stream) => catalogItemFromStream(stream, vodCategories)), 'movie')
  const series = await enrichPosters(seriesRaw.map((item) => catalogItemFromSeries(item, seriesCategories)), 'series')
  const categories: Category[] = [
    ...liveCategories.map((item, order) => ({ id: item.provider_ref, name: item.name, type: 'live' as const, order })),
    ...vodCategories.map((item, order) => ({ id: item.provider_ref, name: item.name, type: 'vod' as const, order })),
    ...seriesCategories.map((item, order) => ({ id: item.provider_ref, name: item.name, type: 'series' as const, order })),
  ]

  if (isDatabaseConfigured) {
    await persistCatalog(server.id, categories, channels, variants, movies, series)
  }

  return {
    serverId: server.id,
    version: `${CATALOG_VERSION}-${Date.now()}`,
    categories,
    channels,
    movies,
    series,
    counts: catalogCounts(categories, channels, movies, series),
    generatedAt: new Date().toISOString(),
    loadTimeMs: Date.now() - startedAt,
  }
}

async function persistCatalog(
  serverId: string,
  categories: Category[],
  channels: Channel[],
  variants: VariantRow[],
  movies: CatalogItem[],
  series: CatalogItem[],
) {
  for (const channel of channels) {
    await sql`
      insert into channels (id, server_id, name, logo, category, type)
      values (${channel.id}, ${serverId}, ${channel.name}, ${channel.logo}, ${channel.category}, 'live')
      on conflict (id) do update set
        name = excluded.name,
        logo = excluded.logo,
        category = excluded.category,
        server_id = excluded.server_id
    `
  }
  for (const variant of variants) {
    await sql`
      insert into channel_variants (id, channel_id, quality, provider_ref, health_score, status)
      values (${variant.id}, ${variant.channel_id}, ${variant.quality}, ${variant.provider_ref}, ${variant.health_score}, 'active')
      on conflict (id) do update set
        quality = excluded.quality,
        provider_ref = excluded.provider_ref,
        status = 'active'
    `
  }
  for (const [type, payload] of [['vod', movies], ['series', series]] as const) {
    await sql`
      insert into provider_catalog_cache (server_id, type, payload, version)
      values (${serverId}, ${type}, ${JSON.stringify(payload)}::jsonb, ${CATALOG_VERSION})
    `
  }
  await sql`
    insert into provider_catalog_cache (server_id, type, payload, version)
    values (${serverId}, 'live', ${JSON.stringify({ categories, channels })}::jsonb, ${CATALOG_VERSION})
  `
}

async function loadFromDatabase(allowStaleVersion = false): Promise<CatalogPayload | null> {
  if (!isDatabaseConfigured) return null
  const server = await getDefaultServer()
  const [channelRows, variantRows, liveRows, vodRows, seriesRows] = await Promise.all([
    sql`select id, name, logo, category, type from channels where server_id = ${server.id} and type = 'live' order by sort_order asc, name asc`.then((r) => r as unknown as ChannelRow[]),
    sql`select id, channel_id, quality, provider_ref, health_score, status from channel_variants where status = 'active' order by channel_id asc, health_score desc`.then((r) => r as unknown as VariantRow[]),
    sql`select payload, version from provider_catalog_cache where server_id = ${server.id} and type = 'live' order by fetched_at desc limit 1`.then((r) => r as unknown as CatalogCacheRow[]),
    sql`select payload, version from provider_catalog_cache where server_id = ${server.id} and type = 'vod' order by fetched_at desc limit 1`.then((r) => r as unknown as CatalogCacheRow[]),
    sql`select payload, version from provider_catalog_cache where server_id = ${server.id} and type = 'series' order by fetched_at desc limit 1`.then((r) => r as unknown as CatalogCacheRow[]),
  ])

  if (!channelRows.length && !vodRows[0]?.payload?.length && !seriesRows[0]?.payload?.length) return null
  if (!allowStaleVersion && (
    (liveRows[0]?.version && liveRows[0].version !== CATALOG_VERSION)
    || (vodRows[0]?.version && vodRows[0].version !== CATALOG_VERSION)
    || (seriesRows[0]?.version && seriesRows[0].version !== CATALOG_VERSION)
  )) return null

  const variantsByChannel = new Map<string, VariantRow[]>()
  for (const variant of variantRows) {
    const list = variantsByChannel.get(variant.channel_id) || []
    list.push(variant)
    variantsByChannel.set(variant.channel_id, list)
  }

  const baseChannels: Channel[] = channelRows.map((channel) => ({
    id: channel.id,
    name: channel.name,
    logo: channel.logo || '',
    category: channel.category || 'Outros',
    type: 'live',
    variants: (variantsByChannel.get(channel.id) || []).map((variant) => publicVariant(variant.id, variant.quality)),
  }))
  const baseChannelsById = new Map(baseChannels.map((channel) => [channel.id, channel]))
  const channels = variantRows.length > baseChannels.length
    ? variantRows.map((variant) => {
      const base = baseChannelsById.get(variant.channel_id)
      const siblingCount = variantsByChannel.get(variant.channel_id)?.length || 0
      const name = siblingCount > 1 && variant.quality !== 'HD' ? `${base?.name || 'Canal'} ${variant.quality}` : base?.name || 'Canal'
      return {
        id: `chv-${variant.id}`,
        name,
        logo: base?.logo || '',
        category: base?.category || 'Outros',
        type: 'live' as const,
        variants: [publicVariant(variant.id, variant.quality)],
      }
    })
    : baseChannels
  const livePayload = liveRows[0]?.payload as unknown as { categories?: Category[]; channels?: Channel[] } | null
  const cachedCategories = livePayload?.categories || []
  const cachedChannelsById = new Map((livePayload?.channels || []).map((channel) => [channel.id, channel]))
  const categories = cachedCategories.length ? cachedCategories : Array.from(new Set(channels.map((channel) => channel.category))).map((name, order) => ({
    id: slugId('cat-live', name),
    name,
    type: 'live' as const,
    order,
  }))
  const channelsWithCachedMeta = channels.map((channel) => ({
    ...channel,
    category_id: cachedChannelsById.get(channel.id)?.category_id,
    image: channel.logo || cachedChannelsById.get(channel.id)?.image || '',
    stream_icon: channel.logo || cachedChannelsById.get(channel.id)?.stream_icon || '',
  }))

  return {
    serverId: server.id,
    version: liveRows[0]?.version || vodRows[0]?.version || seriesRows[0]?.version || CATALOG_VERSION,
    categories,
    channels: channelsWithCachedMeta,
    movies: vodRows[0]?.payload || [],
    series: seriesRows[0]?.payload || [],
    counts: catalogCounts(categories, channelsWithCachedMeta, vodRows[0]?.payload || [], seriesRows[0]?.payload || []),
    generatedAt: new Date().toISOString(),
  }
}

export async function getCatalog(forceSync = false): Promise<CatalogPayload> {
  return cached('catalog-full', CATALOG_VERSION, async () => {
    if (!forceSync) {
      const fromDb = await loadFromDatabase()
      if (fromDb) return fromDb
    }
    try {
      return await syncCatalog()
    } catch (error) {
      const stale = await loadFromDatabase(true)
      if (stale) return { ...stale, loadTimeMs: undefined }
      throw error
    }
  }, Number(process.env.CATALOG_CACHE_TTL_SECONDS || 300))
}

export async function getHome(): Promise<HomeResponse> {
  const catalog = publicCatalog(await getCatalog())
  return {
    catalog_version: catalog.version,
    counts: catalog.counts,
    cache: {
      generated_at: catalog.generatedAt,
      ttl_seconds: Number(process.env.CATALOG_CACHE_TTL_SECONDS || 300),
      load_time_ms: catalog.loadTimeMs,
    },
    rows: [
      { id: 'live-featured', title: 'Canais ao vivo', type: 'live' as const, items: catalog.channels.slice(0, 20).map(channelToItem) },
      { id: 'movies-featured', title: 'Filmes em destaque', type: 'movie' as const, items: catalog.movies.slice(0, 50) },
      { id: 'series-featured', title: 'Séries em destaque', type: 'series' as const, items: catalog.series.slice(0, 30) },
      { id: 'kids-featured', title: 'Kids', type: 'vod' as const, items: catalog.movies.filter((item) => /kids|infantil|desenho|anima/i.test(item.genre || item.title)).slice(0, 20) },
    ].filter((row) => row.items.length),
  }
}

function channelToItem(channel: Channel): CatalogItem {
  return {
    id: channel.id,
    title: channel.name,
    poster: channel.logo,
    type: 'live',
    quality: channel.variants[0]?.quality || 'HD',
    genre: channel.category,
  }
}

export async function loadChannelVariants(channelId: string): Promise<StreamVariant[]> {
  if (!isDatabaseConfigured) {
    const catalog = await getCatalog()
    const channel = catalog.channels.find((item) => item.id === channelId)
    if (!channel) return []
    return channel.variants.map((variant, index) => ({
      id: variant.id,
      channelId,
      quality: variant.quality,
      providerRef: variant.id.split('-').pop() || variant.id,
      priority: index,
      healthScore: 100,
      enabled: true,
    }))
  }

  const rows = (await sql`
    select id, channel_id, quality, provider_ref, health_score, status
    from channel_variants
    where channel_id = ${channelId}
       or id = ${channelId.startsWith('chv-') ? channelId.slice(4) : channelId}
    order by health_score desc, id asc
  `) as unknown as VariantRow[]
  return rows.map((row, index) => ({
    id: row.id,
    channelId: row.channel_id,
    quality: row.quality,
    providerRef: row.provider_ref,
    priority: index,
    healthScore: row.health_score,
    enabled: row.status === 'active',
  }))
}
