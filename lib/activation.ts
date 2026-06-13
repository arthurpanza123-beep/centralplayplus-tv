const ACTIVATION_KEY = 'cpp_device_activated'

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
