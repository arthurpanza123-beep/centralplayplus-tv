const ACTIVATION_KEY = 'cpp_device_activated'
const DEVICE_KEY = 'cpp_device_key'
const TRIAL_END_KEY = 'cpp_trial_ends_at'
const INSTALL_ID_KEY = 'cpp_install_id'
const ACCESS_TOKEN_KEY = 'cpp_access_token'
const REFRESH_TOKEN_KEY = 'cpp_refresh_token'

/** Default trial length: 90 minutes from first launch. */
const TRIAL_DURATION_MS = 90 * 60 * 1000

/**
 * Timestamp (ms) when the free trial ends. Set once on first use and persisted,
 * so the countdown is stable across reloads.
 */
export function getTrialEndsAt(): number {
  if (typeof window === 'undefined') return Date.now() + TRIAL_DURATION_MS
  try {
    const stored = window.localStorage.getItem(TRIAL_END_KEY)
    if (stored) return Number(stored)
    const end = Date.now() + TRIAL_DURATION_MS
    window.localStorage.setItem(TRIAL_END_KEY, String(end))
    return end
  } catch {
    return Date.now() + TRIAL_DURATION_MS
  }
}

/** Milliseconds left in the trial (never negative). */
export function getTrialRemainingMs(): number {
  return Math.max(getTrialEndsAt() - Date.now(), 0)
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `install_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function getInstallId(): string {
  if (typeof window === 'undefined') return 'server'
  let installId = window.localStorage.getItem(INSTALL_ID_KEY)
  if (!installId) {
    installId = randomId()
    window.localStorage.setItem(INSTALL_ID_KEY, installId)
  }
  return installId
}

/** Characters used for the temporary offline fallback key (no ambiguous 0/O/1/I/L). */
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Generate a temporary fallback device key while the backend is unreachable. */
function generateDeviceKey(): string {
  return Array.from({ length: 4 }, () => KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)]).join('')
}

/**
 * Return this device's key, creating and persisting one on first use.
 * The same key is reused for the lifetime of the install (until reset).
 */
export function getDeviceKey(): string {
  if (typeof window === 'undefined') return '----'
  try {
    return window.localStorage.getItem(DEVICE_KEY) || '----'
  } catch {
    return '----'
  }
}

export async function registerDevice(): Promise<{ deviceKey: string; status: string; pollIntervalSeconds: number }> {
  const installId = getInstallId()
  const stored = getDeviceKey()
  if (stored && stored !== '----' && stored !== 'CP-000000') {
    return { deviceKey: stored, status: 'pending', pollIntervalSeconds: 5 }
  }
  const res = await fetch('/api/tv/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      platform: 'android_tv',
      app_version: '1.3.0',
      device_model: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'Android TV',
      install_id: installId,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.device_key) throw new Error(data?.error?.message || 'Falha ao registrar aparelho.')
  window.localStorage.setItem(DEVICE_KEY, data.device_key)
  return { deviceKey: data.device_key, status: data.status || 'pending', pollIntervalSeconds: data.poll_interval_seconds || 5 }
}

/** Generate a brand-new device key, replacing the stored one and clearing activation. */
export function regenerateDeviceKey(): string {
  const key = generateDeviceKey()
  try {
    window.localStorage.setItem(DEVICE_KEY, key)
    window.localStorage.setItem(INSTALL_ID_KEY, randomId())
    // A new device identity means it must be activated again.
    window.localStorage.removeItem(ACTIVATION_KEY)
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  return key
}

/** Whether this device has already been activated (persisted locally). */
export function isDeviceActivated(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ACTIVATION_KEY) === '1'
  } catch {
    return false
  }
}

/** Mark this device as activated so future sessions skip the activation screen. */
export function markDeviceActivated(tokens?: { access_token?: string; refresh_token?: string }): void {
  try {
    window.localStorage.setItem(ACTIVATION_KEY, '1')
    if (tokens?.access_token) window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    if (tokens?.refresh_token) window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

export function getAccessToken(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

export function getRefreshToken(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}
