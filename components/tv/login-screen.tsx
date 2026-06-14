'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { unlockAudio } from '@/lib/sounds'
import { markDeviceActivated, getDeviceKey } from '@/lib/activation'

type CheckState = 'idle' | 'checking' | 'pending' | 'active' | 'blocked' | 'error'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [shake, setShake] = useState(false)
  const [state, setState] = useState<CheckState>('idle')
  const [deviceKey, setDeviceKey] = useState('····')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setDeviceKey(getDeviceKey())
  }, [])

  /**
   * Consulta o backend de ativação. O operador ativa a Device Key no painel /admin;
   * enquanto isso o status volta 'pending' (não ativado). Quando ativar, volta 'active'.
   */
  const checkActivation = useCallback(
    async (opts: { manual?: boolean } = {}) => {
      const key = getDeviceKey()
      setState((s) => (s === 'active' ? s : 'checking'))
      try {
        const res = await fetch(`/api/tv/status/${encodeURIComponent(key)}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const status: string = data?.status ?? 'pending'

        if (status === 'active') {
          setState('active')
          markDeviceActivated()
          if (pollRef.current) clearInterval(pollRef.current)
          // Pequena pausa para o usuário ver o "Ativado!" antes de entrar.
          setTimeout(() => onLogin(), 900)
          return
        }
        if (status === 'blocked' || status === 'expired') {
          setState('blocked')
          return
        }
        // pending / qualquer outro → ainda não ativado
        setState('pending')
        if (opts.manual) {
          setShake(true)
          setTimeout(() => setShake(false), 500)
        }
      } catch {
        setState('error')
      }
    },
    [onLogin],
  )

  // Polling automático a cada 5s enquanto não estiver ativo.
  useEffect(() => {
    checkActivation()
    pollRef.current = setInterval(() => checkActivation(), 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [checkActivation])

  function handleClick() {
    unlockAudio() // primeiro gesto do usuário — libera áudio
    if (state === 'active') {
      onLogin()
      return
    }
    checkActivation({ manual: true })
  }

  // Texto e visual de status conforme o estado atual.
  const statusUI = {
    idle: { dot: 'ring', text: 'Conectando…' },
    checking: { dot: 'ring', text: 'Verificando ativação…' },
    pending: { dot: 'red', text: 'Não ativado. Aguardando liberação no painel.' },
    active: { dot: 'green', text: 'Ativado! Entrando…' },
    blocked: { dot: 'red', text: 'Dispositivo bloqueado. Fale com o suporte.' },
    error: { dot: 'red', text: 'Sem conexão. Verifique a internet e tente de novo.' },
  }[state]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-background animate-cp-fade-in">
      {/* ── Cozy living-room background (heavily blurred) ── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center select-none pointer-events-none scale-105 blur-md"
        style={{ backgroundImage: 'url(/login-room.webp)' }}
      />

      {/* ── Moving neon orbs ── */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-16 w-[30rem] h-[30rem] rounded-full bg-blue-500/22 blur-[140px] animate-cp-neon-1" />
        <div className="absolute top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full bg-fuchsia-500/15 blur-[140px] animate-cp-neon-2" />
        <div className="absolute -bottom-24 left-1/4 w-[24rem] h-[24rem] rounded-full bg-cyan-400/15 blur-[140px] animate-cp-neon-3" />
      </div>

      {/* Even cinematic darkening + vignette to focus the centered card */}
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]" />

      {/* ── Centered activation card ── */}
      <div className="relative z-10 w-full max-w-md mx-4 flex flex-col items-center text-center rounded-[1.75rem] bg-black/55 backdrop-blur-xl border border-white/15 ring-1 ring-white/5 shadow-2xl shadow-black/70 px-10 py-12 animate-cp-fade-up overflow-hidden">
        {/* Subtle top sheen */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full bg-primary/15 blur-3xl" />

        {/* Brand logo */}
        <div className="relative w-full max-w-[16rem] h-16 mx-auto mb-3 drop-shadow-[0_6px_32px_rgba(37,99,235,0.6)]">
          <Image src="/logo-full.webp" alt="Central Play Plus" fill className="object-contain object-center" priority />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white text-balance leading-tight drop-shadow-lg">
          Ative sua TV
        </h1>
        <p className="mt-2.5 text-sm text-white/65 leading-relaxed max-w-[16rem]">
          Informe o código abaixo no painel de ativação para liberar todo o catálogo.
        </p>

        {/* Device key */}
        <div className="mt-7 w-full rounded-2xl bg-white/[0.04] border border-white/10 px-6 py-5">
          <p className="text-[10px] font-bold tracking-[0.4em] text-white/45">DEVICE KEY</p>
          <p className="mt-2 text-5xl font-black tracking-[0.2em] text-white tabular-nums whitespace-nowrap drop-shadow-[0_0_18px_rgba(96,165,250,0.35)]">
            {deviceKey}
          </p>
        </div>

        {/* Status */}
        <div className="mt-5 flex items-center justify-center gap-2.5 min-h-[1.5rem]">
          {statusUI.dot === 'green' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusUI.dot === 'red' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {statusUI.dot === 'ring' && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          <span className="text-sm text-white/70 font-medium">{statusUI.text}</span>
        </div>

        {/* Action button */}
        <button
          onClick={handleClick}
          autoFocus
          disabled={state === 'checking'}
          className={`group mt-7 w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold tracking-wide shadow-xl transition-all hover:scale-[1.02] outline-none focus-visible:ring-4 disabled:opacity-70 disabled:hover:scale-100 ${
            state === 'active'
              ? 'bg-emerald-500 text-white shadow-emerald-500/40 focus-visible:ring-emerald-400/60'
              : 'bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 focus-visible:ring-primary/60'
          } ${shake ? 'animate-cp-shake' : ''}`}
        >
          {state === 'active' ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Entrar
            </>
          ) : (
            <>
              <RefreshCw className={`w-5 h-5 transition-transform duration-500 ${state === 'checking' ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              {state === 'checking' ? 'Verificando…' : 'Verificar ativação'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
