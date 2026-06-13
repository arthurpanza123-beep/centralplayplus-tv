// Lightweight TV-remote sound system using the Web Audio API.
// No audio files needed — all cues are synthesized on the fly.

type CueName = 'nav' | 'select' | 'back' | 'open' | 'jingle'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  // Browsers suspend the context until a user gesture; resume opportunistically.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** A single shaped tone. */
function tone(
  freq: number,
  start: number,
  dur: number,
  {
    type = 'sine',
    gain = 0.18,
    glideTo,
  }: { type?: OscillatorType; gain?: number; glideTo?: number } = {},
) {
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur)
  // Quick attack, smooth decay — feels soft and premium, not beepy.
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

export function playCue(name: CueName) {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime

  switch (name) {
    case 'nav':
      // Subtle short tick when the focus moves.
      tone(660, t, 0.06, { type: 'sine', gain: 0.07 })
      break
    case 'select':
      // Confirming two-note blip.
      tone(720, t, 0.07, { type: 'triangle', gain: 0.13 })
      tone(1080, t + 0.05, 0.1, { type: 'triangle', gain: 0.12 })
      break
    case 'back':
      // Descending note for "back/close".
      tone(520, t, 0.12, { type: 'sine', gain: 0.12, glideTo: 320 })
      break
    case 'open':
      // Soft "whoosh up" when entering the app.
      tone(380, t, 0.22, { type: 'sine', gain: 0.16, glideTo: 760 })
      break
    case 'jingle': {
      // Short brand arpeggio (C–E–G–C) with a sparkle.
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((f, i) => tone(f, t + i * 0.13, 0.4, { type: 'triangle', gain: 0.16 }))
      tone(1568, t + 0.52, 0.5, { type: 'sine', gain: 0.1 })
      break
    }
  }
}

export function setMuted(value: boolean) {
  muted = value
}

export function isMuted() {
  return muted
}

export function toggleMuted(): boolean {
  muted = !muted
  return muted
}

/** Call from a user gesture to unlock audio on strict browsers. */
export function unlockAudio() {
  getCtx()
}

// ─── Brand music (real .mp3 file) ───────────────────────────────────────────
// Drop your track at /public/sounds/intro.mp3 and it plays on app entry.
// Browsers only allow audio AFTER a user gesture, so we trigger it from the
// activation button click (the first real interaction).
const INTRO_SRC = '/sounds/intro.mp3'
let introAudio: HTMLAudioElement | null = null

/** Play the brand intro music. Must be called from a user gesture. */
export function playIntroMusic() {
  if (muted || typeof window === 'undefined') return
  try {
    if (!introAudio) {
      introAudio = new Audio(INTRO_SRC)
      introAudio.volume = 0.6
    }
    introAudio.currentTime = 0
    // Fails silently if the file isn't there yet — safe to ship.
    void introAudio.play().catch(() => {})
  } catch {
    /* no-op */
  }
}

/** Stop the brand music (e.g. when leaving the splash/login). */
export function stopIntroMusic() {
  if (introAudio) {
    introAudio.pause()
    introAudio.currentTime = 0
  }
}
