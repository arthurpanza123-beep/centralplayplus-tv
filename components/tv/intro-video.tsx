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
  const [ready, setReady] = useState(false)
  const done = useRef(false)

  function finish() {
    if (done.current) return
    done.current = true
    setClosing(true)
    // Wait for the fade-out before advancing.
    setTimeout(onDone, 600)
  }

  useEffect(() => {
    // Fade in on next frame.
    const raf = requestAnimationFrame(() => setVisible(true))

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

    const onError = () => finish()
    v.addEventListener('error', onError)
    return () => {
      cancelAnimationFrame(raf)
      v.removeEventListener('error', onError)
      events.forEach((e) => window.removeEventListener(e, unmute))
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
        visible && !closing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <video
        ref={videoRef}
        src="/intro.webm"
        poster="/intro-poster.webp"
        className="h-full w-full object-cover"
        playsInline
        autoPlay
        preload="auto"
        onCanPlay={() => setReady(true)}
        onEnded={finish}
      />

      {/* Compact, branded skip pill — bottom-right. */}
      <button
        onClick={finish}
        className={`group absolute bottom-6 right-6 z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white/75 backdrop-blur-md transition-all duration-300 hover:border-primary/60 hover:bg-black/70 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          ready && !closing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Pular abertura"
      >
        Pular
        <SkipForward className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}
