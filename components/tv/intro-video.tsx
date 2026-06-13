'use client'

import { useEffect, useRef, useState } from 'react'
import { SkipForward, Volume2, VolumeX } from 'lucide-react'

/**
 * Full-screen brand intro video — the very first thing shown when the app loads.
 *
 * Because it runs before any user gesture, browsers block autoplay WITH sound,
 * so we start muted (which is always allowed) and offer an "Ativar som" toggle.
 *
 * It calls onDone() when the video ends, when the user skips, or if the file
 * is missing/unsupported — so the app never gets stuck on this screen.
 */
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(true)
  const done = useRef(false)

  // Fire onDone only once, no matter which path triggers it.
  function finish() {
    if (done.current) return
    done.current = true
    onDone()
  }

  function toggleSound() {
    const v = videoRef.current
    if (!v) return
    const next = !muted
    v.muted = next
    if (!next) v.play().catch(() => {})
    setMuted(next)
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    // Muted autoplay is always permitted — guarantees the intro plays first.
    v.muted = true
    v.play().catch(() => finish())

    // Safety net: if the source can't load at all, don't trap the user.
    const onError = () => finish()
    v.addEventListener('error', onError)
    return () => v.removeEventListener('error', onError)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src="/intro.webm"
        className="h-full w-full object-contain"
        playsInline
        autoPlay
        preload="auto"
        onCanPlay={() => setReady(true)}
        onEnded={finish}
      />

      {/* Sound toggle — bottom-right. */}
      <button
        onClick={toggleSound}
        className={`absolute bottom-8 right-8 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2.5 text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:border-white/40 hover:bg-black/70 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label={muted ? 'Ativar som' : 'Silenciar'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {muted ? 'Ativar som' : 'Som ligado'}
      </button>

      {/* Skip button — small, bottom-left, appears once the video can play. */}
      <button
        onClick={finish}
        className={`group absolute bottom-8 left-8 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2.5 text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:border-white/40 hover:bg-black/70 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Pular abertura"
      >
        <SkipForward className="h-4 w-4" />
        Clique para pular abertura
      </button>
    </div>
  )
}
