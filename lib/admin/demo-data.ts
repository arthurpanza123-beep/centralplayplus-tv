/**
 * Demo data for the activation & monitoring dashboard.
 *
 * TODO(Codex): replace these helpers with real reads from the database
 * (tables `tv_devices`, `clients`, `device_sessions`, `playback_errors`).
 * The dashboard UI only depends on the shape of `AdminDeviceView` /
 * `PlaybackErrorView`, so swapping the data source requires no UI changes.
 */

export type DeviceStatus = 'pending' | 'active' | 'blocked' | 'expired'

export interface AdminDeviceView {
  deviceKey: string
  clientName: string | null
  status: DeviceStatus
  plan: string | null
  provider: string
  platform: 'android_tv' | 'fire_tv' | 'web' | 'mobile'
  appVersion: string
  createdAt: string // ISO
  expiresAt: string | null // ISO
  lastSeenAt: string | null // ISO
  online: boolean
}

export interface PlaybackErrorView {
  id: string
  deviceKey: string
  channelName: string
  variantLabel: string
  errorCode: string
  at: string // ISO
}

export interface ChannelHealthView {
  channelName: string
  totalVariants: number
  healthyVariants: number
  // 0..100 — média do health_score das variantes
  healthScore: number
}

const now = Date.now()
const hours = (h: number) => new Date(now - h * 3600_000).toISOString()
const days = (d: number) => new Date(now + d * 86400_000).toISOString()

export const DEMO_DEVICES: AdminDeviceView[] = [
  {
    deviceKey: 'CP-7K2M-9XQ',
    clientName: 'João Silva',
    status: 'active',
    plan: 'Mensal',
    provider: 'principal',
    platform: 'android_tv',
    appVersion: '1.0.0',
    createdAt: hours(720),
    expiresAt: days(18),
    lastSeenAt: hours(0.1),
    online: true,
  },
  {
    deviceKey: 'CP-3F8N-2WLP',
    clientName: 'Maria Souza',
    status: 'active',
    plan: 'Anual',
    provider: 'principal',
    platform: 'fire_tv',
    appVersion: '1.0.0',
    createdAt: hours(2400),
    expiresAt: days(140),
    lastSeenAt: hours(2),
    online: false,
  },
  {
    deviceKey: 'CP-9J4D-7RTX',
    clientName: null,
    status: 'pending',
    plan: null,
    provider: 'principal',
    platform: 'android_tv',
    appVersion: '1.0.0',
    createdAt: hours(0.5),
    expiresAt: null,
    lastSeenAt: hours(0.3),
    online: true,
  },
  {
    deviceKey: 'CP-1A6B-5KMN',
    clientName: 'Pedro Lima',
    status: 'active',
    plan: 'Trimestral',
    provider: 'secundario',
    platform: 'web',
    appVersion: '1.0.0',
    createdAt: hours(1200),
    expiresAt: days(4),
    lastSeenAt: hours(0.05),
    online: true,
  },
  {
    deviceKey: 'CP-8H2C-3VBN',
    clientName: 'Ana Costa',
    status: 'blocked',
    plan: 'Mensal',
    provider: 'principal',
    platform: 'android_tv',
    appVersion: '0.9.8',
    createdAt: hours(3000),
    expiresAt: days(9),
    lastSeenAt: hours(48),
    online: false,
  },
  {
    deviceKey: 'CP-5G7E-1QWA',
    clientName: 'Carlos Mendes',
    status: 'expired',
    plan: 'Mensal',
    provider: 'principal',
    platform: 'fire_tv',
    appVersion: '1.0.0',
    createdAt: hours(5000),
    expiresAt: days(-3),
    lastSeenAt: hours(80),
    online: false,
  },
  {
    deviceKey: 'CP-2D9F-6ZXC',
    clientName: 'Lucia Ferreira',
    status: 'active',
    plan: 'Anual',
    provider: 'principal',
    platform: 'android_tv',
    appVersion: '1.0.0',
    createdAt: hours(800),
    expiresAt: days(290),
    lastSeenAt: hours(0.2),
    online: true,
  },
]

export const DEMO_PLAYBACK_ERRORS: PlaybackErrorView[] = [
  { id: 'e1', deviceKey: 'CP-1A6B-5KMN', channelName: 'SporTV', variantLabel: 'FHD #2', errorCode: 'TIMEOUT', at: hours(0.4) },
  { id: 'e2', deviceKey: 'CP-7K2M-9XQ', channelName: 'HBO Max', variantLabel: 'HD #1', errorCode: 'HTTP_403', at: hours(1.1) },
  { id: 'e3', deviceKey: 'CP-2D9F-6ZXC', channelName: 'Globo', variantLabel: '4K #1', errorCode: 'STALL', at: hours(2.3) },
  { id: 'e4', deviceKey: 'CP-1A6B-5KMN', channelName: 'Telecine', variantLabel: 'FHD #3', errorCode: 'HTTP_404', at: hours(5.6) },
]

export const DEMO_CHANNEL_HEALTH: ChannelHealthView[] = [
  { channelName: 'Globo', totalVariants: 4, healthyVariants: 4, healthScore: 98 },
  { channelName: 'SporTV', totalVariants: 3, healthyVariants: 2, healthScore: 71 },
  { channelName: 'HBO Max', totalVariants: 3, healthyVariants: 3, healthScore: 92 },
  { channelName: 'Telecine', totalVariants: 4, healthyVariants: 2, healthScore: 58 },
  { channelName: 'Discovery', totalVariants: 2, healthyVariants: 2, healthScore: 95 },
  { channelName: 'Cartoon', totalVariants: 2, healthyVariants: 1, healthScore: 44 },
]

export const PLANS = ['Mensal', 'Trimestral', 'Semestral', 'Anual'] as const
export const PROVIDERS = ['principal', 'secundario'] as const
