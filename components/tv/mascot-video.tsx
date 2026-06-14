'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Plays the mascot tumble animation once (transparent WebM with a native alpha
 * channel) and then freezes on the last frame, so the character stays put
 * behind the plan card. The green screen was removed offline via ffmpeg
 * (colorkey + despill), so there is no per-frame processing at runtime.
 */
export function MascotVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onEnded = () => {
      // Pin to the last frame and stop, leaving the mascot frozen in place.
      video.pause()
      try {
        video.currentTime = Math.max(0, (video.duration || 0) - 0.05)
      } catch {
        /* ignore */
      }
    }

    const start = () => {
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }

    video.addEventListener('ended', onEnded)
    if (video.readyState >= 2) start()
    else video.addEventListener('canplay', start, { once: true })

    return () => {
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('canplay', start)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      src="/mascot-alpha.webm"
      muted
      playsInline
      autoPlay
      preload="auto"
      className={cn('object-contain', className)}
      aria-hidden
    />
  )
}
