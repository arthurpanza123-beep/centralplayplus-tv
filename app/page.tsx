'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Tv2, Radio, Film, Smile, ChevronRight, ChevronLeft } from 'lucide-react'
import { TVLayout } from '@/components/tv/tv-layout'
import { WATCHING_ITEMS, KIDS_ITEMS, USER } from '@/lib/data'

const HERO_SLIDES = [
  {
    id: 1,
    title: 'Seu próximo momento incrível',
    highlight: 'começa aqui.',
    subtitle: 'Canais, filmes, séries e muito mais. Tudo em um só lugar.',
    cta: 'Abrir canais',
    ctaHref: '/canais',
  },
  {
    id: 2,
    title: 'Novos filmes toda semana',
    highlight: 'assista agora.',
    subtitle: 'Os lançamentos mais esperados estão disponíveis em HD e 4K.',
    cta: 'Ver filmes',
    ctaHref: '/filmes',
  },
  {
    id: 3,
    title: 'Séries que vão te prender',
    highlight: 'maratone hoje.',
    subtitle: 'Temporadas completas para você não perder nenhum episódio.',
    cta: 'Ver séries',
    ctaHref: '/series',
  },
]

const QUICK_CATEGORIES = [
  { label: 'Canais', subtitle: 'Assista agora', icon: Radio, href: '/canais', colorFrom: '#0d1f4a', colorTo: '#1a3a8a' },
  { label: 'Filmes', subtitle: 'Grandes histórias', icon: Film, href: '/filmes', colorFrom: '#2a0a3a', colorTo: '#4a1060' },
  { label: 'Séries', subtitle: 'Para maratonar', icon: Tv2, href: '/series', colorFrom: '#1a1a08', colorTo: '#3a3210' },
  { label: 'Kids', subtitle: 'Diversão garantida', icon: Smile, href: '/kids', colorFrom: '#0a1a2a', colorTo: '#10304a' },
]

export default function HomePage() {
  const [slide, setSlide] = useState(0)
  const current = HERO_SLIDES[slide]

  return (
    <TVLayout>
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-6 p-6 pb-8">

          {/* Hero banner */}
          <section
            className="relative rounded-2xl overflow-hidden border border-border/30"
            style={{ minHeight: '220px', background: 'linear-gradient(135deg, #0a1a3a 0%, #0d2a5a 60%, #1a1040 100%)' }}
          >
            <div className="relative z-10 flex items-center justify-between h-full p-8 pr-24">
              <div className="flex flex-col gap-3 max-w-lg">
                <h2 className="text-3xl font-bold text-foreground leading-tight text-balance">
                  {current.title}{' '}
                  <span className="text-primary">{current.highlight}</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.subtitle}
                </p>
                <Link
                  href={current.ctaHref}
                  className="inline-flex items-center gap-2 mt-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors w-fit"
                >
                  <Tv2 className="w-4 h-4" />
                  {current.cta}
                </Link>
              </div>
              <div className="absolute right-6 bottom-0 w-36 h-36 opacity-90">
                <Image src="/mascot.png" alt="Central Play mascote" fill className="object-contain object-bottom" />
              </div>
            </div>

            {/* Slide dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => setSlide((slide + 1) % HERO_SLIDES.length)}
              className="absolute right-16 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </section>

          {/* Quick categories */}
          <section>
            <div className="grid grid-cols-4 gap-3">
              {QUICK_CATEGORIES.map(({ label, subtitle, icon: Icon, href, colorFrom, colorTo }) => (
                <Link
                  key={label}
                  href={href}
                  className="relative flex items-center gap-4 p-5 rounded-xl overflow-hidden border border-border/20 hover:border-primary/40 transition-all hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${colorFrom} 0%, ${colorTo} 100%)` }}
                >
                  <Icon className="w-7 h-7 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Continuar assistindo */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Continuar assistindo</h2>
            <div className="grid grid-cols-4 gap-3">
              {WATCHING_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="relative rounded-xl overflow-hidden border border-border/20 hover:border-primary/40 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <div
                    className="relative aspect-video flex flex-col justify-end p-3"
                    style={{ background: `linear-gradient(160deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)` }}
                  >
                    {item.isNew && (
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                        NOVO EPISÓDIO
                      </span>
                    )}
                    <p className="text-xs text-foreground font-bold uppercase leading-tight text-balance">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.episode}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Para a família */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">Para a família</h2>
            <div className="grid grid-cols-4 gap-3">
              {KIDS_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden border border-border/20 hover:border-primary/40 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <div
                    className="aspect-video flex items-end p-3"
                    style={{ background: `linear-gradient(160deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)` }}
                  >
                    <p className="text-xs font-bold text-white uppercase text-balance leading-tight drop-shadow-md">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer info */}
          <div className="flex items-center justify-end gap-6 text-xs text-muted-foreground pt-2 border-t border-border/20">
            <div className="flex items-center gap-2">
              <span>Código do dispositivo</span>
              <span className="font-bold text-foreground">{USER.deviceCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Expira em</span>
              <span className="text-foreground font-medium">{USER.validity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Versão</span>
              <span className="text-foreground font-medium">{USER.appVersion}</span>
            </div>
          </div>

        </div>
      </div>
    </TVLayout>
  )
}
