'use client'

import { memo, useState, useMemo, useCallback } from 'react'
import { Activity } from 'react'
import Image from 'next/image'
import {
  Home, Radio, Film, Tv2, Smile, Search, Heart, Settings, Crown,
  Play, Pause, Volume2, Maximize2, Star,
  Bell, Shield, MessageSquare, MonitorPlay, Monitor, ChevronRight, LogOut,
  User, Mail, Calendar, Smartphone, ChevronLeft,
} from 'lucide-react'
import { Topbar } from '@/components/tv/topbar'
import { ContentCard } from '@/components/tv/content-card'
import { ContentModal } from '@/components/tv/content-modal'
import { cn } from '@/lib/utils'
import {
  MOVIES, SERIES, CHANNELS, WATCHING_ITEMS, KIDS_ITEMS, USER,
  MOVIE_CATEGORIES, SERIES_CATEGORIES, CHANNEL_CATEGORIES,
} from '@/lib/data'
import type { Movie, Series, Channel } from '@/lib/types'

// ─── Tab IDs ──────────────────────────────────────────────────────────────────
type TabId = 'home' | 'canais' | 'filmes' | 'series' | 'kids' | 'buscar' | 'favoritos' | 'configuracoes'

const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'canais', label: 'Canais', icon: Radio },
  { id: 'filmes', label: 'Filmes', icon: Film },
  { id: 'series', label: 'Séries', icon: Tv2 },
  { id: 'kids', label: 'Kids', icon: Smile },
  null as unknown as { id: TabId; label: string; icon: React.ElementType }, // divider
  { id: 'buscar', label: 'Buscar', icon: Search },
  { id: 'favoritos', label: 'Favoritos', icon: Heart },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = memo(function Sidebar({ active, onNav }: { active: TabId; onNav: (id: TabId) => void }) {
  return (
    <aside
      className="flex flex-col rounded-2xl bg-gradient-to-b from-white/80 via-white/60 to-white/15 border border-white/50 shadow-sm shrink-0 overflow-hidden"
      style={{ width: 'var(--tv-sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="relative w-11 h-11 shrink-0">
          <Image src="/mascot.png" alt="Central Play mascote" fill className="object-contain" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[11px] text-muted-foreground font-semibold tracking-widest uppercase">Central</span>
          <span className="text-xl font-black text-foreground tracking-tight">PLAY</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto px-3" aria-label="Navegação principal">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item, idx) => {
            if (!item) return <li key={`div-${idx}`}><hr className="my-2 border-border" /></li>
            const { id, label, icon: Icon } = item
            return (
              <li key={id}>
                <button
                  onClick={() => onNav(id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    active === id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Plan badge */}
      <div className="px-3 pb-5">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-300/60 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left">
          <Crown className="w-5 h-5 text-yellow-500 shrink-0" />
          <div className="flex flex-col leading-tight min-w-0 flex-1">
            <span className="text-sm font-semibold text-yellow-700 truncate">Plano Ativado</span>
            <span className="text-xs text-yellow-600/80 truncate">Premium</span>
          </div>
          <ChevronRight className="w-4 h-4 text-yellow-500/60 shrink-0" />
        </button>
      </div>
    </aside>
  )
})

// ─── Shell header ─────────────────────────────────────────────────────────────
const ShellHeader = memo(function ShellHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 shrink-0">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-2xl font-bold text-foreground">{title}</h1>}
        {right}
      </div>
      <Topbar />
    </header>
  )
})

// ─── Category sub-sidebar ─────────────────────────────────────────────────────
const CategorySidebar = memo(function CategorySidebar({
  categories, selected, onSelect,
}: { categories: string[]; selected: string; onSelect: (c: string) => void }) {
  return (
    <aside className="flex flex-col shrink-0 py-3 gap-0.5 border-r border-border/40 overflow-y-auto bg-white/50 backdrop-blur-sm" style={{ width: 180 }}>
      {categories.map((cat) => (
        <button key={cat} onClick={() => onSelect(cat)}
          className={cn(
            'flex items-center px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors text-left',
            selected === cat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}>
          {cat}
        </button>
      ))}
    </aside>
  )
})

// ─── HOME TAB ────────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { id: 1, title: 'Seu próximo momento incrível', highlight: 'começa aqui.', subtitle: 'Canais, filmes, séries e kids.\nTudo em um só lugar.', cta: 'Abrir canais', ctaTab: 'canais' as TabId },
  { id: 2, title: 'Novos filmes toda semana', highlight: 'assista agora.', subtitle: 'Os lançamentos mais esperados\nem HD e 4K.', cta: 'Ver filmes', ctaTab: 'filmes' as TabId },
  { id: 3, title: 'Séries que vão te prender', highlight: 'maratone hoje.', subtitle: 'Temporadas completas para\nnão perder nenhum episódio.', cta: 'Ver séries', ctaTab: 'series' as TabId },
]

const QUICK_CATS = [
  { label: 'Canais', subtitle: '2.312 ao vivo', icon: Radio, tab: 'canais' as TabId, bg: 'bg-blue-500', imgRight: null },
  { label: 'Filmes', subtitle: '23.894 títulos', icon: Film, tab: 'filmes' as TabId, bg: 'bg-purple-600', imgRight: null },
  { label: 'Séries', subtitle: '6.128 episódios', icon: Tv2, tab: 'series' as TabId, bg: 'bg-amber-500', imgRight: null },
  { label: 'Kids', subtitle: '2.015 itens', icon: Smile, tab: 'kids' as TabId, bg: 'bg-teal-500', imgRight: null },
]

// Watching items use real-world-ish thumbnail bg colors matching the mockup
const WATCHING_BG: Record<string, string> = {
  'Jornal Central': 'linear-gradient(135deg,#1a1f2e 0%,#2d3a52 100%)',
  'Futebol Total': 'linear-gradient(135deg,#0f2010 0%,#1e4020 100%)',
  'A Herança': 'linear-gradient(135deg,#1a1008 0%,#3a2510 100%)',
  'Além do Horizonte': 'linear-gradient(135deg,#0a1528 0%,#1a3555 100%)',
}

function HomeTab({ onNav }: { onNav: (id: TabId) => void }) {
  const [slide, setSlide] = useState(0)
  const cur = HERO_SLIDES[slide]

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-5 p-6 pb-8">

        {/* Top clock row */}
        <div className="flex items-center justify-end -mb-1">
          <Topbar />
        </div>

        {/* Hero banner */}
        <section className="relative rounded-2xl overflow-hidden shadow-md" style={{ minHeight: 230 }}>
          {/* background photo */}
          <div className="absolute inset-0">
            <Image
              src="/hero-robot.png"
              alt=""
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1920px) 100vw"
            />
            {/* dark left gradient so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex items-center h-full p-8" style={{ minHeight: 230 }}>
            <div className="flex flex-col gap-3 max-w-md">
              <h2 className="text-3xl font-bold text-white leading-tight text-balance">
                {cur.title}{' '}
                <span className="text-blue-300">{cur.highlight}</span>
              </h2>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{cur.subtitle}</p>
              <button
                onClick={() => onNav(cur.ctaTab)}
                className="inline-flex items-center gap-2 mt-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors w-fit shadow-sm"
              >
                <Tv2 className="w-4 h-4" />
                {cur.cta}
              </button>
            </div>
          </div>

          {/* Slide dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {HERO_SLIDES.map((s, i) => (
              <button key={s.id} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
            ))}
          </div>
          <button onClick={() => setSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors z-10" aria-label="Slide anterior">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setSlide((slide + 1) % HERO_SLIDES.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors z-10" aria-label="Próximo slide">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </section>

        {/* Quick category cards */}
        <div className="grid grid-cols-4 gap-3">
          {QUICK_CATS.map(({ label, subtitle, icon: Icon, tab, bg }) => (
            <button key={label} onClick={() => onNav(tab)}
              className={cn(
                'relative flex items-center gap-4 p-5 rounded-2xl text-left overflow-hidden transition-all hover:scale-[1.02] shadow-sm hover:shadow-md',
                bg
              )}>
              <Icon className="w-7 h-7 text-white/90 shrink-0" />
              <div>
                <p className="font-bold text-white text-base">{label}</p>
                <p className="text-xs text-white/75 mt-0.5">{subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Continuar assistindo */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Continuar assistindo</h2>
          <div className="grid grid-cols-4 gap-3">
            {WATCHING_ITEMS.map((item) => (
              <div key={item.id}
                className="relative rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer bg-card">
                <div className="relative aspect-video flex flex-col justify-end p-3"
                  style={{ background: WATCHING_BG[item.title] ?? `linear-gradient(160deg,${item.colorFrom} 0%,${item.colorTo} 100%)` }}>
                  {item.isNew && (
                    <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500 text-white">AO VIVO</span>
                  )}
                  <p className="text-xs text-white font-bold uppercase leading-tight text-balance">{item.title}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">{item.episode}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Em destaque */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Em destaque</h2>
          <div className="flex gap-3 items-end">
            <div className="grid grid-cols-6 gap-3 flex-1">
              {MOVIES.slice(0, 6).map((m) => <ContentCard key={m.id} item={m} onClick={() => {}} />)}
            </div>
            {/* Device info card */}
            <div className="shrink-0 rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-3" style={{ width: 190 }}>
              <div className="flex items-start gap-3">
                <Monitor className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Seu dispositivo</p>
                  <p className="text-lg font-black text-foreground tracking-wider">{USER.deviceCode}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Expira em</p>
                  <p className="text-sm font-bold text-primary">{USER.validity}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">Versão do app {USER.appVersion}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── FILMES TAB ───────────────────────────────────────────────────────────────
function FilmesTab() {
  const [category, setCategory] = useState(MOVIE_CATEGORIES[0])
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return MOVIES.filter((m) => {
      const matchSearch = !q || m.title.toLowerCase().includes(q)
      const matchCategory = category === 'Lançamentos' || category === 'Em alta' ||
        m.genre.toLowerCase() === category.toLowerCase() || (category === 'Infantil' && m.rating <= 10)
      return matchSearch && matchCategory
    })
  }, [search, category])

  const handleSelect = useCallback((item: Movie | Series) => setSelected(item), [])
  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <>
      <ShellHeader title="Filmes" right={<SearchInput placeholder="Buscar filmes" value={search} onChange={setSearch} />} />
      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar categories={MOVIE_CATEGORIES} selected={category} onSelect={setCategory} />
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm font-semibold text-primary mb-4">{category}</p>
          {filtered.length > 0
            ? <div className="grid grid-cols-6 gap-3">{filtered.map((m) => <ContentCard key={m.id} item={m} onClick={handleSelect} />)}</div>
            : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhum filme encontrado.</div>
          }
        </div>
      </div>
      <ContentModal item={selected} onClose={handleClose} />
    </>
  )
}

// ─── SÉRIES TAB ───────────────────────────────────────────────────────────────
function SeriesTab() {
  const [category, setCategory] = useState(SERIES_CATEGORIES[0])
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return SERIES.filter((s) => {
      const matchSearch = !q || s.title.toLowerCase().includes(q)
      const matchCategory = category === 'Lançamentos' || category === 'Em alta' ||
        s.genre.toLowerCase() === category.toLowerCase() || (category === 'Infantil' && s.rating <= 10)
      return matchSearch && matchCategory
    })
  }, [search, category])

  const handleSelect = useCallback((item: Movie | Series) => setSelected(item), [])
  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <>
      <ShellHeader title="Séries" right={<SearchInput placeholder="Buscar séries" value={search} onChange={setSearch} />} />
      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar categories={SERIES_CATEGORIES} selected={category} onSelect={setCategory} />
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm font-semibold text-primary mb-4">{category}</p>
          {filtered.length > 0
            ? <div className="grid grid-cols-6 gap-3">{filtered.map((s) => <ContentCard key={s.id} item={s} onClick={handleSelect} />)}</div>
            : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhuma série encontrada.</div>
          }
        </div>
      </div>
      <ContentModal item={selected} onClose={handleClose} />
    </>
  )
}

// ─── CANAIS TAB ───────────────────────────────────────────────────────────────
const DAYS = [
  { short: 'QUI', num: 15 }, { short: 'SEX', num: 16 }, { short: 'SÁB', num: 17 },
  { short: 'DOM', num: 18 }, { short: 'SEG', num: 19 }, { short: 'TER', num: 20 }, { short: 'QUA', num: 21 },
]

function CanaisTab() {
  const [category, setCategory] = useState(CHANNEL_CATEGORIES[0])
  const [selectedChannel, setSelectedChannel] = useState<Channel>(CHANNELS[1])
  const [isPlaying, setIsPlaying] = useState(true)
  const [selectedDay, setSelectedDay] = useState(2)

  const filteredChannels = useMemo(
    () => CHANNELS.filter((c) => category === 'Esportes' ? c.category === 'Esportes' : true),
    [category]
  )

  return (
    <>
      <ShellHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Category */}
    <aside className="flex flex-col shrink-0 py-3 gap-0.5 border-r border-border/40 overflow-y-auto bg-white/50 backdrop-blur-sm" style={{ width: 180 }}>
          {CHANNEL_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn('flex items-center px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors text-left',
                category === cat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
              {cat}
            </button>
          ))}
        </aside>

        {/* Channel list */}
          <div className="flex flex-col shrink-0 border-r border-border/40 overflow-y-auto bg-white/50 backdrop-blur-sm" style={{ width: 240 }}>
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canais &bull; {category}</p>
          </div>
          {filteredChannels.map((ch) => (
            <div key={ch.id} role="button" tabIndex={0}
              onClick={() => setSelectedChannel(ch)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedChannel(ch)}
              className={cn('flex items-center gap-3 px-4 py-3.5 border-b border-border/60 text-left transition-colors cursor-pointer',
                selectedChannel.id === ch.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-accent')}>
              <span className="text-xs text-muted-foreground w-8 shrink-0">{ch.number}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm" style={{ background: ch.logoColor }}>
                {ch.logoText}
              </div>
              <span className="text-sm text-foreground font-medium truncate">{ch.name}</span>
              <button className="ml-auto shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors" aria-label="Favoritar" onClick={(e) => e.stopPropagation()}>
                <Star className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Player + EPG */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Canais</span>
            <span className="text-border/80">|</span>
            <span className="text-primary font-semibold">{category}</span>
          </div>
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-border shadow-sm flex-1 max-h-64">
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0a1428 0%,#112040 100%)' }}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold text-white mx-auto mb-2 shadow-md" style={{ background: selectedChannel.logoColor }}>
                  {selectedChannel.logoText}
                </div>
                <p className="text-sm text-white/80">{selectedChannel.name}</p>
                <p className="text-xs text-white/50 mt-1">{selectedChannel.currentProgram}</p>
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />AO VIVO
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'} className="text-white hover:text-primary transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <Volume2 className="w-4 h-4 text-white/70" />
                <div className="flex-1 h-1 bg-white/20 rounded-full"><div className="h-full w-3/5 bg-primary rounded-full" /></div>
                <span className="text-xs text-white/70">AO VIVO</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/30 text-white/70">HD</span>
                <Maximize2 className="w-4 h-4 text-white/70 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {selectedChannel.programs.map((prog) => (
              <div key={prog.time} className={cn('flex items-center gap-4 px-4 py-3 border-b border-border/60 last:border-0', prog.isLive && 'bg-primary/5')}>
                <span className="text-sm font-semibold text-foreground w-12 shrink-0">{prog.time}</span>
                {prog.isLive && <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden />}
                <span className={cn('text-sm flex-1', prog.isLive ? 'text-foreground font-medium' : 'text-muted-foreground')}>{prog.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{prog.time} – {prog.endTime}</span>
                {prog.isLive && <div className="h-1 w-28 bg-muted rounded-full shrink-0"><div className="h-full w-1/2 bg-primary rounded-full" /></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Day navigator */}
          <aside className="flex flex-col shrink-0 border-l border-border/40 py-4 gap-1 overflow-y-auto bg-white/50 backdrop-blur-sm" style={{ width: 72 }}>
          {DAYS.map((d, i) => (
            <button key={d.num} onClick={() => setSelectedDay(i)}
              className={cn('flex flex-col items-center py-3 mx-2 rounded-xl text-xs font-medium transition-colors',
                selectedDay === i ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
              <span className="text-[10px] uppercase tracking-wider">{d.short}</span>
              <span className="text-base font-bold mt-0.5">{d.num}</span>
            </button>
          ))}
        </aside>
      </div>
    </>
  )
}

// ─── CONFIGURAÇÕES TAB ────────────────────────────────────────────────────────
function ConfiguracoesTab() {
  const [notifications, setNotifications] = useState(USER.notifications)
  const [autoplay, setAutoplay] = useState(USER.autoplay)

  const accountRows = [
    { icon: User, label: 'Nome', value: USER.name },
    { icon: Mail, label: 'E-mail', value: USER.email },
    { icon: Crown, label: 'Plano', value: USER.plan },
    { icon: Calendar, label: 'Validade', value: USER.validity },
    { icon: Smartphone, label: 'Código do dispositivo', value: USER.deviceCode },
  ]
  const settingsRows = [
    { icon: Bell, label: 'Notificações', description: 'Receba novidades e alertas', type: 'toggle' as const, value: notifications, onToggle: () => setNotifications((v) => !v) },
    { icon: Shield, label: 'Controle parental', description: `Filtragem de conteúdo: ${USER.parentalControl}`, type: 'chevron' as const },
    { icon: MessageSquare, label: 'Idioma', description: USER.language, type: 'chevron' as const },
    { icon: MonitorPlay, label: 'Qualidade de vídeo', description: `${USER.videoQuality} (Recomendada)`, type: 'chevron' as const },
    { icon: Play, label: 'Reprodução automática', description: 'Próximo episódio em 5 segundos', type: 'toggle' as const, value: autoplay, onToggle: () => setAutoplay((v) => !v) },
    { icon: Monitor, label: 'Dispositivos conectados', description: `${USER.connectedDevices} dispositivos conectados nesta conta`, type: 'chevron' as const },
  ]

  return (
    <>
      <ShellHeader title="Configurações" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border"><p className="text-sm font-semibold text-primary">Sua conta</p></div>
              {accountRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/60 last:border-0">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="text-sm text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-4 p-5 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-left group shadow-sm">
              <div className="w-10 h-10 rounded-xl border border-orange-200 bg-orange-100 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-700">Sair do aplicativo</p>
                <p className="text-xs text-orange-500/80 mt-0.5">Encerrar sessão neste dispositivo</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400/60 group-hover:text-orange-500 transition-colors shrink-0" />
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {settingsRows.map(({ icon: Icon, label, description, type, value, onToggle }) => (
              <div key={label} className={cn('flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0', type === 'chevron' && 'cursor-pointer hover:bg-accent/60 transition-colors')}>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                {type === 'toggle' ? (
                  <button role="switch" aria-checked={value} onClick={onToggle}
                    className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', value ? 'bg-primary' : 'bg-muted')}>
                    <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', value ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                    <span className="sr-only">{value ? 'Ativado' : 'Desativado'}</span>
                  </button>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-r border-border">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Versão do app</p><p className="text-sm font-semibold text-foreground">{USER.appVersion}</p></div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-r border-border">
              <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{USER.plan}</p><p className="text-sm font-semibold text-foreground">Ativo</p></div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Validade</p><p className="text-sm font-semibold text-foreground">{USER.validity}</p></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── SHARED SEARCH INPUT ──────────────────────────────────────────────────────
function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative ml-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-4 py-2 rounded-full bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-64 transition-colors" />
    </div>
  )
}

// ─── STUB TABS ────────────────────────────────────────────────────────────────
function StubTab({ title }: { title: string }) {
  return (
    <>
      <ShellHeader title={title} />
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{title} em breve.</div>
    </>
  )
}

// ─── ROOT SHELL ───────────────────────────────────────────────────────────────
const TABS: TabId[] = ['home', 'canais', 'filmes', 'series', 'kids', 'buscar', 'favoritos', 'configuracoes']

export default function AppShell() {
  const [active, setActive] = useState<TabId>('home')

  return (
    <div className="flex h-screen w-screen overflow-hidden p-4 gap-4">
      {/* Wallpaper — fixed layer behind everything */}
      <img
        src="/bg-wall.png"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover -z-10 select-none pointer-events-none"
      />

      {/* Sidebar */}
      <Sidebar active={active} onNav={setActive} />

      <div className="flex flex-col flex-1 min-w-0 relative rounded-2xl bg-white/80 overflow-hidden border border-white/50 shadow-sm">
        {TABS.map((tab) => (
          <Activity key={tab} mode={active === tab ? 'visible' : 'hidden'}>
            <div
              className="absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out will-change-[opacity,transform]"
              style={{
                opacity: active === tab ? 1 : 0,
                transform: active === tab ? 'translateX(0)' : 'translateX(14px)',
                pointerEvents: active === tab ? 'auto' : 'none',
              }}
            >
              {tab === 'home' && <HomeTab onNav={setActive} />}
              {tab === 'filmes' && <FilmesTab />}
              {tab === 'series' && <SeriesTab />}
              {tab === 'canais' && <CanaisTab />}
              {tab === 'configuracoes' && <ConfiguracoesTab />}
              {tab === 'kids' && <StubTab title="Kids" />}
              {tab === 'buscar' && <StubTab title="Buscar" />}
              {tab === 'favoritos' && <StubTab title="Favoritos" />}
            </div>
          </Activity>
        ))}
      </div>
    </div>
  )
}
