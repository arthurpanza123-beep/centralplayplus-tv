'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Channel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { playCue } from '@/lib/sounds'
import { clearDeviceActivation, getAccessToken } from '@/lib/activation'

interface ChannelPlayerProps {
  channel: Channel | null
  onClose: () => void
}

/** Truly fullscreen live player. No buttons or labels — close with Back. */
export function ChannelPlayer({ channel, onClose }: ChannelPlayerProps) {
  const [showHint, setShowHint] = useState(true)
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hintTimer = useRef<number | null>(null)
  const needsReactivation = [
    'provider_account_expired',
    'PROVIDER_ACCOUNT_EXPIRED',
    'provider_account_missing',
    'PROVIDER_ACCOUNT_MISSING',
  ].includes(errorCode)

  function reactivate() {
    clearDeviceActivation()
    window.location.reload()
  }

  // Escape / Back closes fullscreen (capture phase, before global nav).
  useEffect(() => {
    if (!channel) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopImmediatePropagation()
        playCue('back')
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [channel, onClose])

  // Brief channel hint that fades away for a clean, immersive view.
  useEffect(() => {
    if (!channel) return
    setShowHint(true)
    setPlaybackUrl('')
    setStatus('loading')
    setErrorCode('')
    hintTimer.current = window.setTimeout(() => setShowHint(false), 3000)
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current)
    }
  }, [channel])

  useEffect(() => {
    if (!channel) return
    const channelId = channel.id

    const controller = new AbortController()
    async function loadPlayback() {
      try {
        const token = getAccessToken()
        const res = await fetch(`/api/tv/channel/${encodeURIComponent(channelId)}/play`, {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.playback_url) {
          throw new Error(data?.error?.code || `HTTP_${res.status}`)
        }
        setPlaybackUrl(data.playback_url)
      } catch (error) {
        if (controller.signal.aborted) return
        setStatus('error')
        setErrorCode(error instanceof Error ? error.message : 'PLAY_FAILED')
      }
    }

    loadPlayback()
    return () => controller.abort()
  }, [channel])

  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return
    const video = videoRef.current
    video.src = playbackUrl
    video.load()
    const promise = video.play()
    if (promise) {
      promise.catch(() => {
        setStatus('error')
        setErrorCode('AUTOPLAY_BLOCKED')
      })
    }
  }, [playbackUrl])

  if (!channel || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reproduzindo ${channel.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black animate-cp-zoom-in cursor-none"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        autoPlay
        playsInline
        controls={false}
        onCanPlay={() => setStatus('ready')}
        onPlaying={() => setStatus('ready')}
        onWaiting={() => setStatus('loading')}
        onError={() => {
          setStatus('error')
          setErrorCode('VIDEO_ERROR')
        }}
      />

      {status !== 'ready' && (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 45%, ${channel.logoColor}14 0%, #04060b 75%)` }}
        />
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            <span className="text-white/80 text-sm font-semibold">Carregando canal...</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="rounded-2xl border border-white/10 bg-black/70 px-8 py-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="text-white text-2xl font-black">{needsReactivation ? 'Sua sessão precisa ser reativada' : 'Canal indisponível agora'}</div>
            <div className="mt-2 text-white/55 text-xs font-semibold">{errorCode || 'PLAY_FAILED'}</div>
            {needsReactivation && (
              <button
                type="button"
                onClick={reactivate}
                className="mt-5 rounded-lg bg-white px-5 py-2 text-sm font-black text-black"
              >
                Gerar nova ativação
              </button>
            )}
          </div>
        </div>
      )}

      {/* Brief auto-hiding channel hint (bottom-right) — channel name, no A2 bug */}
      <div
        className={cn(
          'absolute bottom-10 right-10 flex items-center gap-3 transition-opacity duration-700',
          showHint ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="text-white text-2xl font-black drop-shadow-lg">{channel.name}</span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold ring-2 ring-white/80 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />AO VIVO
        </span>
      </div>

    </div>,
    document.body,
  )
}
