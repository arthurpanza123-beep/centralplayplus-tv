const ACTIVATION_KEY = 'cpp_device_activated'
const DEVICE_KEY = 'cpp_device_key'

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
