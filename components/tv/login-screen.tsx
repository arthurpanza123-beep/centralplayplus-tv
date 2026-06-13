'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Mail, Lock, ArrowRight, Smartphone, Loader2 } from 'lucide-react'
import { MOVIES, SERIES } from '@/lib/data'
import { cn } from '@/lib/utils'

const WALL = [...MOVIES, ...SERIES].slice(0, 24)

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('joao.silva@email.com')
  const [password, setPassword] = useState('senha123')
  const [loading, setLoading] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(onLogin, 1100)
  }

  return (
    <div className="fixed inset-0 z-40 flex overflow-hidden bg-[#070b16] animate-cp-fade-in">
      {/* ── Catalog wall (left, cinematic) ── */}
      <div className="relative hidden md:flex flex-1 overflow-hidden">
        <div
          className="absolute inset-0 grid grid-cols-6 gap-3 p-3 -rotate-6 scale-125 origin-center opacity-90"
          aria-hidden="true"
        >
          {WALL.map((item, i) => (
            <div
              key={item.id}
              className="rounded-xl shadow-2xl"
              style={{
                aspectRatio: '2 / 3',
                background: item.gradient ?? `linear-gradient(160deg, ${item.colorFrom}, ${item.colorTo})`,
                transform: `translateY(${i % 2 === 0 ? '-14px' : '14px'})`,
              }}
            />
          ))}
        </div>
        {/* Dark cinematic veils */}
        <div className="absolute inset-0 bg-[#070b16]/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b16]/20 via-[#070b16]/40 to-[#070b16]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(37,99,235,0.25),transparent_60%)]" />

        {/* Brand overlay */}
        <div className="relative z-10 flex flex-col justify-center px-14 max-w-xl animate-cp-fade-up">
          <div className="relative w-24 h-24 mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <Image src="/mascot-icon.png" alt="Central Play Plus" fill className="object-contain" priority />
          </div>
          <h1 className="text-6xl font-black tracking-tight leading-[0.95]">
            <span className="text-white">Seu universo</span><br />
            <span className="text-blue-400">de entretenimento.</span>
          </h1>
          <p className="mt-5 text-base text-white/55 leading-relaxed max-w-md">
            Mais de 30 mil títulos, canais ao vivo, séries e conteúdo infantil.
            Tudo em um só lugar, em qualidade máxima.
          </p>
          <div className="mt-7 flex items-center gap-6 text-white/40 text-sm font-semibold tracking-wide">
            <span>Filmes</span><span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Séries</span><span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Canais</span><span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Kids</span>
          </div>
        </div>
      </div>

      {/* ── Login card (right) ── */}
      <div className="relative flex items-center justify-center w-full md:w-[480px] shrink-0 bg-white/[0.03] backdrop-blur-2xl border-l border-white/10 px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.12),transparent_55%)]" />

        <form onSubmit={submit} className="relative w-full max-w-sm flex flex-col gap-5 animate-cp-fade-up">
          {/* Mobile brand */}
          <div className="md:hidden flex items-center gap-3 mb-2">
            <div className="relative w-12 h-12">
              <Image src="/mascot-icon.png" alt="" fill className="object-contain" />
            </div>
            <span className="text-2xl font-black text-white">CENTRAL <span className="text-blue-400">PLAY</span></span>
          </div>

          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-white/45 mt-1.5">Entre para continuar assistindo</p>
          </div>

          {/* Email */}
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-white/60 tracking-wide">E-mail</span>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/12 text-white placeholder:text-white/30 text-sm outline-none transition-all focus:border-blue-400/70 focus:bg-white/[0.09] focus:ring-4 focus:ring-blue-500/20"
                placeholder="seu@email.com"
              />
            </div>
          </label>

          {/* Password */}
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-white/60 tracking-wide">Senha</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/12 text-white placeholder:text-white/30 text-sm outline-none transition-all focus:border-blue-400/70 focus:bg-white/[0.09] focus:ring-4 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>
          </label>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-white/55 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-blue-500 w-3.5 h-3.5" />
              Manter conectado
            </label>
            <button type="button" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              Esqueceu a senha?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'group relative w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-blue-600/40 transition-all hover:shadow-blue-500/60 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/50 disabled:opacity-80',
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Entrando…</>
            ) : (
              <>Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-white/35 font-medium">ou</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          {/* Device login */}
          <button
            type="button"
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white/[0.05] border border-white/12 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            Entrar com código do dispositivo
          </button>

          <p className="text-center text-xs text-white/35 mt-1">
            Não tem uma conta?{' '}
            <button type="button" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              Assine agora
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
