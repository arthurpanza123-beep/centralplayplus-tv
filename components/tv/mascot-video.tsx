'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Plays the mascot tumble video once with the green chroma-key background
 * removed in real time, then freezes on the last frame. The source webm is
 * VP9 with a solid green background (no alpha channel), so we draw each frame
 * to a canvas and knock out the green per-pixel.
 */
export function MascotVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let raf = 0
    let running = true

    const sizeCanvas = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
    }

    // Per-frame chroma key: remove green-dominant pixels and suppress spill.
    const drawFrame = () => {
      if (!canvas.width) sizeCanvas()
      if (canvas.width) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        try {
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const d = frame.data
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i]
            const g = d[i + 1]
            const b = d[i + 2]
            // Green screen: green clearly dominates red and blue.
            if (g > 90 && g > r * 1.35 && g > b * 1.35) {
              d[i + 3] = 0
            } else if (g > r && g > b) {
              // Spill suppression on edges: pull green down toward r/b.
              d[i + 1] = Math.max(r, b)
            }
          }
          ctx.putImageData(frame, 0, 0)
        } catch {
          // ignore cross-origin / not-ready frames
        }
      }
      if (running && !video.ended) raf = requestAnimationFrame(drawFrame)
    }

    const start = () => {
      sizeCanvas()
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(drawFrame)
    }

    const onEnded = () => {
      running = false
      cancelAnimationFrame(raf)
      // Leave the last (frozen) frame painted on the canvas.
      drawFrame()
    }

    video.addEventListener('loadedmetadata', sizeCanvas)
    video.addEventListener('canplay', start)
    video.addEventListener('ended', onEnded)
    // If the video is already ready (listener attached late), start immediately.
    if (video.readyState >= 2) start()
    else video.load()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      video.removeEventListener('loadedmetadata', sizeCanvas)
      video.removeEventListener('canplay', start)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* Full-size but transparent: the browser only decodes frames for videos that
          have real layout dimensions (1px / display:none videos won't decode). The
          canvas on top shows the chroma-keyed result. */}
      <video
        ref={videoRef}
        src="/mascot.webm"
        muted
        playsInline
        autoPlay
        preload="auto"
        className="absolute inset-0 w-full h-full object-contain opacity-0 pointer-events-none"
        aria-hidden
      />
      <canvas ref={canvasRef} className="relative w-full h-full object-contain" aria-hidden />
    </div>
  )
}
