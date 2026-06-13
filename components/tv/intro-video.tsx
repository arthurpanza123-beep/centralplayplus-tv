'use client'

import { useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'
import { stopIntroMusic } from '@/lib/sounds'

/**
 * Full-screen brand intro video, shown every time the user enters the app.
 *
 * Drop your file at /public/intro.mp4 (H.264/AAC recommended for best
 * cross-browser support and fast start). The player autoplays with sound
 * because it's reached right after the user clicks "Entrar" (a valid gesture).
 *
 * It calls onDone() when the video ends, when the user skips, or if the file
 * is missing/unsupported — so the app never gets stuck on this screen.
 */
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const done = useRef(false)

  // Fire onDone only once, no matter which path triggers it.
  function finish() {
    if (done.current) return
    done.current = true
    onDone()
  }

  useEffect(() => {
    // The video carries its own audio — silence the brand music underneath it.
    stopIntroMusic()

    const v = videoRef.current
    if (!v) return

    // Try to start with sound. If the browser blocks unmuted autoplay,
    // fall back to muted playback so the visual still plays.
    v.play().catch(() => {
      v.muted = true
      v.play().catch(() => finish())
    })

    // Safety net: if the source can't load at all, don't trap the user.
    const onError = () => finish()
    v.addEventListener('error', onError)
    return () => v.removeEventListener('error', onError)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src="/intro.mp4"
        className="h-full w-full object-cover"
        playsInline
        autoPlay
        preload="auto"
        onCanPlay={() => setReady(true)}
        onEnded={finish}
      />

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
