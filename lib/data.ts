import type { Movie, Series, Channel, WatchingItem, KidsItem, User } from './types'

/** Pre-compute gradient strings at module-load time so JSX never runs template literals on each render */
function g(from: string, to: string): string {
  return `linear-gradient(160deg, ${from} 0%, ${to} 100%)`
}

export const MOVIES: Movie[] = []

export const SERIES: Series[] = []

export const CHANNELS: Channel[] = []

export const WATCHING_ITEMS: WatchingItem[] = []

export const KIDS_ITEMS: KidsItem[] = []

/** Whether a plan label represents a free trial / test (vs a paid plan). */
export function isTrialPlan(plan: string): boolean {
  return /teste|trial|gr[áa]tis|demo/i.test(plan)
}

/** Format a trial countdown as "1 hora e 15 restantes" or "30 minutos restantes". */
export function formatTrialRemaining(ms: number): string {
  if (ms <= 0) return 'Teste expirado'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (h > 0) return `${h} ${h === 1 ? 'hora' : 'horas'} e ${min} restantes`
  return `${min} ${min === 1 ? 'minuto' : 'minutos'} restantes`
}

/** Days left until a DD/MM/YYYY validity date (never negative). */
export function daysRemaining(validity: string): number {
  const [d, m, y] = validity.split('/').map(Number)
  if (!d || !m || !y) return 0
  const end = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000)
  return Math.max(diff, 0)
}

export const USER: User = {
  name: 'Central Play Plus',
  email: '',
  plan: 'Central Play Plus',
  validity: '31/12/2026',
  deviceCode: '',
  notifications: true,
  autoplay: true,
  parentalControl: '12 anos',
  language: 'Português (Brasil)',
  videoQuality: 'Automático',
  connectedDevices: 1,
  appVersion: '1.4.0',
}

export const MOVIE_CATEGORIES = [
  'Lançamentos',
  'Em alta',
  'Ação',
  'Comédia',
  'Drama',
  'Suspense',
  'Ficção científica',
  'Terror',
  'Infantil',
]

export const SERIES_CATEGORIES = [
  'Lançamentos',
  'Em alta',
  'Drama',
  'Suspense',
  'Ação',
  'Comédia',
  'Crime',
  'Ficção científica',
  'Romance',
  'Infantil',
]

export const CHANNEL_CATEGORIES = [
  'Todos',
  'Esportes',
  'Filmes',
  'Séries',
  'Notícias',
  'Documentários',
  'Desenhos',
]

// Inject pre-computed gradient strings so components never run template literals on each render
MOVIES.forEach((m) => { m.gradient = g(m.colorFrom, m.colorTo) })
SERIES.forEach((s) => { s.gradient = g(s.colorFrom, s.colorTo) })
