'use client'

import { useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'

/**
 * Full-screen brand intro video — the very first thing shown when the app loads.
 *
 * It tries to play WITH sound by default; if the browser blocks unmuted
 * autoplay (no prior gesture), it silently falls back to muted playback.
 * Fades in on mount and fades out before handing off via onDone().
 * onDone() also fires on end, on skip, or on load error — so it never traps.
 */
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  // TV-style skip: first OK/Enter reveals the prompt, second one confirms.
  const [promptVisible, setPromptVisible] = useState(false)
  // Mirror of promptVisible so the (once-bound) key listener reads a fresh value.
  const promptVisibleRef = useRef(false)
  const done = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function setPrompt(open: boolean) {
    promptVisibleRef.current = open
    setPromptVisible(open)
  }

  function finish() {
    if (done.current) return
    done.current = true
    setClosing(true)
    // Wait for the fade-out before advancing.
    setTimeout(onDone, 600)
  }

  // Reveal the skip prompt and auto-hide it after a few idle seconds.
  function revealPrompt() {
    setPrompt(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setPrompt(false), 4000)
  }

  // OK/Enter (or click): first press reveals, second press skips.
  function onSelect() {
    if (done.current) return
    if (promptVisibleRef.current) finish()
    else revealPrompt()
  }

  useEffect(() => {
    // Fade in on next frame.
    const raf = requestAnimationFrame(() => setVisible(true))

    // Preload the next screen's background so it's cached before the card shows.
    const pre = new window.Image()
    pre.src = '/login-room.webp'

    const v = videoRef.current
    if (!v) return

    // Try sound ON immediately. Browsers usually block unmuted autoplay with no
    // prior gesture, so we fall back to muted playback to keep the video rolling.
    v.volume = 1
    v.muted = false
    v.play().catch(() => {
      v.muted = true
      v.play().catch(() => finish())
    })

    // If we ended up muted, unmute on the user's first interaction — no button needed.
    const unmute = () => {
      if (done.current) return
      v.muted = false
      v.volume = 1
      v.play().catch(() => {})
    }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'click', 'keydown', 'touchstart', 'mousemove', 'wheel']
    events.forEach((e) => window.addEventListener(e, unmute, { once: true, passive: true }))

    // Remote OK / keyboard Enter (and Space) drive the skip prompt.
    const onKey = (e: KeyboardEvent) => {
      // Ignore auto-repeat (held key) so a single press doesn't reveal AND skip.
      if (e.repeat) return
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        onSelect()
      }
    }
    window.addEventListener('keydown', onKey)

    const onError = () => finish()
    v.addEventListener('error', onError)
    return () => {
      cancelAnimationFrame(raf)
      v.removeEventListener('error', onError)
      events.forEach((e) => window.removeEventListener(e, unmute))
      window.removeEventListener('keydown', onKey)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  return (
    <div
      onClick={onSelect}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
        visible && !closing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <video
        ref={videoRef}
        src="/intro-hd.webm"
        poster="/intro-poster.webp"
        className="h-full w-full object-cover"
        playsInline
        autoPlay
        preload="auto"
        onEnded={finish}
      />

      {/* Skip prompt — hidden until OK/Enter (or a click) reveals it.
          Press OK/Enter again (or click it) to skip. */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
        className={`group absolute bottom-6 right-6 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-sm font-semibold tracking-wide text-white backdrop-blur-md transition-all duration-300 hover:border-primary/60 hover:bg-black/75 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          promptVisible && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        aria-label="Pular abertura"
      >
        Pular abertura
        <SkipForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}
