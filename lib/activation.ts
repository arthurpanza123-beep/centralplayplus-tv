const ACTIVATION_KEY = 'cpp_device_activated'
const DEVICE_KEY = 'cpp_device_key'
const TRIAL_END_KEY = 'cpp_trial_ends_at'

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

/** Characters used for the device key (no ambiguous 0/O/1/I). */
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Generate a fresh device key: 4 alphanumeric characters (e.g. "A7K9"). */
function generateDeviceKey(): string {
  return Array.from({ length: 4 }, () => KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)]).join('')
}

/**
 * Return this device's key, creating and persisting one on first use.
 * The same key is reused for the lifetime of the install (until reset).
 */
export function getDeviceKey(): string {
  if (typeof window === 'undefined') return 'XXXX'
  try {
    let key = window.localStorage.getItem(DEVICE_KEY)
    if (!key) {
      key = generateDeviceKey()
      window.localStorage.setItem(DEVICE_KEY, key)
    }
    return key
  } catch {
    return generateDeviceKey()
  }
}

/** Generate a brand-new device key, replacing the stored one and clearing activation. */
export function regenerateDeviceKey(): string {
  const key = generateDeviceKey()
  try {
    window.localStorage.setItem(DEVICE_KEY, key)
    // A new device identity means it must be activated again.
    window.localStorage.removeItem(ACTIVATION_KEY)
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
export function markDeviceActivated(): void {
  try {
    window.localStorage.setItem(ACTIVATION_KEY, '1')
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}
