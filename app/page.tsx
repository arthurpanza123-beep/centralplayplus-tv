'use client'

import { memo, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Activity } from 'react'
import Image from 'next/image'
import {
  Home, Radio, Film, Tv2, Smile, Search, Heart, Settings, Crown,
  Play, Info, Star,
  Bell, Shield, MessageSquare, MonitorPlay, Monitor, ChevronRight, LogOut,
  User, Mail, Calendar, Smartphone, RefreshCw,
} from 'lucide-react'
import { Topbar } from '@/components/tv/topbar'
import { ContentCard } from '@/components/tv/content-card'
import { ContentDetail } from '@/components/tv/content-detail'
import { ChannelPlayer } from '@/components/tv/channel-player'
import { LoginScreen } from '@/components/tv/login-screen'
import { IntroVideo } from '@/components/tv/intro-video'
import { LoadingScreen } from '@/components/tv/loading-screen'
import { useTvNavigation } from '@/hooks/use-tv-navigation'
import { playCue } from '@/lib/sounds'
import { isDeviceActivated, getDeviceKey, regenerateDeviceKey, getTrialRemainingMs } from '@/lib/activation'
import { cn } from '@/lib/utils'
import {
  MOVIES, SERIES, CHANNELS, KIDS_ITEMS, USER, daysRemaining,
  isTrialPlan, formatTrialRemaining,
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
const Sidebar = memo(function Sidebar({ active, onNav, collapsed }: { active: TabId; onNav: (id: TabId) => void; collapsed: boolean }) {
  const trial = isTrialPlan(USER.plan)
  const planDays = daysRemaining(USER.validity)
  // Live trial countdown — refreshes every 30s so the remaining time stays current.
  const [trialMs, setTrialMs] = useState(0)
  useEffect(() => {
    if (!trial) return
    setTrialMs(getTrialRemainingMs())
    const id = setInterval(() => setTrialMs(getTrialRemainingMs()), 30_000)
    return () => clearInterval(id)
  }, [trial])

  const planTitle = trial ? 'Teste ativado' : USER.plan
  const planSubtitle = trial ? formatTrialRemaining(trialMs) : `${planDays} dias restantes`

  return (
    <aside
      className="flex flex-col bg-sidebar border-r border-white/5 shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
      style={{ width: collapsed ? 84 : 240 }}
    >
      {/* Logo — short mascot only, larger when expanded */}
      <div className="flex items-center justify-center pt-7 pb-5 mb-2 border-b border-white/5">
        <div className={cn('relative drop-shadow-[0_2px_12px_rgba(37,99,235,0.4)] transition-all duration-300 ease-out', collapsed ? 'w-10 h-10' : 'w-14 h-14')}>
          <Image src="/mascot-icon.png" alt="Central Play Plus" fill className="object-contain" priority />
        </div>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-2 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2.5' : 'px-3')} aria-label="Navegação principal">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item, idx) => {
            if (!item) return <li key={`div-${idx}`}><hr className="my-2.5 border-border/60" /></li>
            const { id, label, icon: Icon } = item
            const isActive = active === id
            return (
              <li key={id}>
                <button
                  onClick={() => onNav(id)}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  className={cn(
                    'group/nav relative w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 outline-none',
                    'focus-visible:ring-4 focus-visible:ring-primary/40',
                    collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary-foreground/80" />}
                  <Icon className={cn('w-5 h-5 shrink-0 transition-transform', !isActive && 'group-hover/nav:scale-110')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Plan badge — plan type + days left. Full card when expanded, icon only when collapsed */}
      <div className={cn('pb-5', collapsed ? 'px-2.5' : 'px-3')}>
        <button
          title={collapsed ? `${planTitle} · ${planSubtitle}` : undefined}
          aria-label={`${planTitle}, ${planSubtitle}`}
          className={cn(
            'group/plan w-full flex items-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 hover:from-primary/30 hover:to-primary/10 transition-all text-left shadow-sm hover:shadow-md outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
            collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
          )}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/40">
            <Crown className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <span className="text-sm font-bold text-primary truncate capitalize">{planTitle}</span>
                <span className="text-xs text-primary/75 truncate font-medium">{planSubtitle}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-primary/60 shrink-0 group-hover/plan:translate-x-0.5 transition-transform" />
            </>
          )}
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
    <aside className="flex flex-col shrink-0 py-3 gap-0.5 border-r border-border/40 overflow-y-auto bg-white/[0.03]" style={{ width: 180 }}>
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
// Horizontal poster row, Netflix-style.
const PosterRow = memo(function PosterRow({
  title, items, onSelect,
}: { title: string; items: (Movie | Series)[]; onSelect: (i: Movie | Series) => void }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="text-lg font-bold text-foreground px-8 tracking-tight">{title}</h2>
      <div className="flex items-start gap-4 overflow-x-auto px-8 py-4 scrollbar-none">
        {items.map((item) => (
          <div key={item.id} className="shrink-0 w-[150px]">
            <ContentCard item={item} onClick={onSelect} />
          </div>
        ))}
      </div>
    </section>
  )
})

function HomeTab({ onNav }: { onNav: (id: TabId) => void }) {
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const featured = MOVIES[0]

  const handleSelect = useCallback((item: Movie | Series) => setSelected(item), [])
  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      {/* Floating clock */}
      <div className="absolute top-4 right-6 z-30">
        <Topbar />
      </div>

      {/* Full-bleed cinematic hero */}
      <section className="relative w-full" style={{ height: '58vh' }}>
        <Image src="/posters/hero-backdrop.png" alt="" fill priority sizes="100vw" className="object-cover object-center" />
        {/* Fades into the page */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end pb-10 px-8 max-w-2xl gap-3">
          <h1 className="text-5xl font-black text-white leading-[1.02] text-balance tracking-tight drop-shadow-lg">
            {featured.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-white/85">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-current" />{featured.rating}
            </span>
            <span>{featured.year}</span>
            <span className="px-1.5 py-0.5 rounded border border-white/40 text-xs">{featured.quality}</span>
            <span>{featured.genre}</span>
          </div>
          <p className="text-sm text-white/75 leading-relaxed max-w-lg line-clamp-2">{featured.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => handleSelect(featured)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-md bg-white text-black text-base font-bold hover:bg-white/85 hover:scale-[1.03] transition-all outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Play className="w-5 h-5 fill-current" />Assistir
            </button>
            <button onClick={() => handleSelect(featured)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-md bg-white/15 text-white text-base font-bold backdrop-blur-sm hover:bg-white/25 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Info className="w-5 h-5" />Mais informações
            </button>
          </div>
        </div>
      </section>

      {/* Rows — pulled up to overlap the hero fade */}
      <div className="relative z-10 flex flex-col gap-9 mt-2 pb-10">
        <PosterRow title="Em alta hoje" items={MOVIES.slice(0, 10)} onSelect={handleSelect} />
        <PosterRow title="Continue assistindo" items={MOVIES.slice(10, 18)} onSelect={handleSelect} />
        <PosterRow title="Séries em destaque" items={SERIES.slice(0, 10)} onSelect={handleSelect} />
        <PosterRow title="Filmes para a família" items={SERIES.slice(8, 18)} onSelect={handleSelect} />
      </div>

      <ContentDetail item={selected} onClose={handleClose} />
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
      <ContentDetail item={selected} onClose={handleClose} />
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
      <ContentDetail item={selected} onClose={handleClose} />
    </>
  )
}

// ─── CANAIS TAB ───────────────────────────────────────────────────────────────
function CanaisTab() {
  const [category, setCategory] = useState(CHANNEL_CATEGORIES[0])
  const [selectedChannel, setSelectedChannel] = useState<Channel>(CHANNELS[1])
  const [fullscreen, setFullscreen] = useState(false)

  const filteredChannels = useMemo(
    () => CHANNELS.filter((c) => category === 'Esportes' ? c.category === 'Esportes' : true),
    [category]
  )

  // Channel-name flash overlay shown briefly whenever the channel changes.
  const [showNameFlash, setShowNameFlash] = useState(false)
  // Auto-zoom: after 20s idle on the small preview, expand to fullscreen.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TV behavior: pressing OK on a channel zooms straight into fullscreen.
  const openChannel = useCallback((ch: Channel) => {
    setSelectedChannel(ch)
    setFullscreen(true)
  }, [])

  // Flash the channel name on every change of the selected channel.
  useEffect(() => {
    setShowNameFlash(true)
    const t = setTimeout(() => setShowNameFlash(false), 2600)
    return () => clearTimeout(t)
  }, [selectedChannel])

  // (Re)start the 20s idle countdown; expands to fullscreen when it elapses.
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (fullscreen) return
    idleTimer.current = setTimeout(() => setFullscreen(true), 20000)
  }, [fullscreen])

  // Reset the idle timer whenever the channel changes or we leave fullscreen.
  useEffect(() => {
    resetIdle()
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
  }, [resetIdle, selectedChannel])

  // "Now / next" program info for the preview bar.
  const liveIndex = selectedChannel.programs.findIndex((p) => p.isLive)
  const nextProgram = liveIndex >= 0 ? selectedChannel.programs[liveIndex + 1] : selectedChannel.programs[0]
  // Live progress from the current program's start/end time vs. now.
  const liveProgress = useMemo(() => {
    const live = selectedChannel.programs.find((p) => p.isLive)
    if (!live) return 35
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const start = toMin(live.time)
    const end = toMin(live.endTime)
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    if (end <= start) return 35
    return Math.min(Math.max(((now - start) / (end - start)) * 100, 5), 98)
  }, [selectedChannel])

  return (
    <>
      <ShellHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Category */}
    <aside className="flex flex-col shrink-0 py-3 gap-0.5 border-r border-border/40 overflow-y-auto bg-white/[0.03]" style={{ width: 180 }}>
          {CHANNEL_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn('flex items-center px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors text-left',
                category === cat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
              {cat}
            </button>
          ))}
        </aside>

        {/* Channel list */}
          <div className="flex flex-col shrink-0 border-r border-border/40 overflow-y-auto bg-white/[0.03]" style={{ width: 240 }}>
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canais &bull; {category}</p>
          </div>
          {filteredChannels.map((ch) => (
            <div key={ch.id} role="button" tabIndex={0}
              onClick={() => openChannel(ch)}
              onMouseEnter={() => setSelectedChannel(ch)}
              onFocus={() => setSelectedChannel(ch)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); openChannel(ch) } }}
              className={cn('group/ch relative flex items-center gap-3 px-4 py-3 border-b border-border/60 text-left transition-all duration-300 cursor-pointer outline-none overflow-hidden',
                selectedChannel.id === ch.id
                  ? 'bg-primary/15 shadow-[inset_0_0_24px_rgba(37,99,235,0.25)]'
                  : 'hover:bg-accent')}>
              {/* Animated active accent bar (blue/white) */}
              {selectedChannel.id === ch.id && (
                <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-300 via-primary to-cyan-300 bg-[length:100%_200%] animate-cp-accent-slide shadow-[0_0_12px_rgba(37,99,235,0.9)]" />
              )}
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm transition-all duration-300',
                selectedChannel.id === ch.id && 'ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-card scale-105')}
                style={{ background: ch.logoColor }}>
                {ch.logoText}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className={cn('text-sm font-medium truncate transition-colors', selectedChannel.id === ch.id ? 'text-white' : 'text-foreground')}>{ch.name}</span>
                <span className="text-[11px] text-muted-foreground truncate">{ch.currentProgram}</span>
              </div>
              {selectedChannel.id === ch.id && (
                <span className="flex items-end gap-0.5 h-4 shrink-0" aria-label="No ar">
                  <span className="w-0.5 bg-cyan-300 rounded-full animate-cp-eq-1" />
                  <span className="w-0.5 bg-white rounded-full animate-cp-eq-2" />
                  <span className="w-0.5 bg-primary rounded-full animate-cp-eq-3" />
                  <span className="w-0.5 bg-cyan-300 rounded-full animate-cp-eq-2" />
                </span>
              )}
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
          {/* Reduced 16:9 preview, centered — click (or 20s idle) zooms to fullscreen */}
          <div className="flex items-center justify-center pt-2 pb-1" onMouseMove={resetIdle}>
          <button
            onClick={() => openChannel(selectedChannel)}
            aria-label={`Abrir ${selectedChannel.name} em tela cheia`}
            className="group/prev relative aspect-video w-full max-w-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-black/40 text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/60 transition-transform duration-300 hover:scale-[1.025]"
          >
            {/* Cinematic channel-tinted backdrop */}
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 35%, ${selectedChannel.logoColor} 0%, #070b14 72%)` }}
            />
            <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 80% 90%, ${selectedChannel.logoColor}88 0%, transparent 55%)` }} />

            {/* Animated "live signal" waves behind the logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
              <span className="absolute w-40 h-40 rounded-full border border-white/10 animate-cp-wave" />
              <span className="absolute w-40 h-40 rounded-full border border-white/10 animate-cp-wave [animation-delay:1s]" />
              <span className="absolute w-40 h-40 rounded-full border border-white/10 animate-cp-wave [animation-delay:2s]" />
            </div>

            {/* Channel logo bug */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-28 h-28 rounded-[1.75rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-1 ring-white/15"
                style={{ background: selectedChannel.logoColor }}
              >
                {selectedChannel.logoText}
              </div>
              <span className="text-sm font-semibold text-white/55 tracking-wide">{selectedChannel.category}</span>
            </div>

            {/* Top badges: AO VIVO + HD */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-[11px] font-bold shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />AO VIVO
              </span>
              <span className="px-2 py-1 rounded-md bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold">HD</span>
            </div>

            {/* Bottom info bar — NOW + NEXT + live progress */}
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <p className="text-2xl font-black text-white leading-tight drop-shadow">{selectedChannel.name}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                <span className="text-sm text-white/85 truncate">
                  <span className="text-primary font-bold">AGORA</span> · {selectedChannel.currentProgram}
                </span>
                {nextProgram && (
                  <span className="text-sm text-white/55 truncate">
                    <span className="font-bold">A SEGUIR</span> · {nextProgram.title} · {nextProgram.time}
                  </span>
                )}
              </div>
              <div className="mt-3 h-1.5 w-full max-w-md bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all" style={{ width: `${liveProgress}%` }} />
              </div>
            </div>

            {/* Channel-name flash — appears briefly when the channel changes */}
            {showNameFlash && (
              <div key={selectedChannel.id} className="absolute inset-0 flex items-center justify-center pointer-events-none animate-cp-name-flash">
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-black/55 backdrop-blur-md ring-1 ring-white/15 shadow-2xl">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0 shadow-lg" style={{ background: selectedChannel.logoColor }}>
                    {selectedChannel.logoText}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-white leading-tight">{selectedChannel.name}</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />AO VIVO
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Expand hint */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 group-hover/prev:opacity-100 group-focus-visible/prev:opacity-100 transition-opacity">
              <span className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-base font-bold shadow-lg">
                <Play className="w-5 h-5 fill-current" /> Assistir agora
              </span>
              <span className="text-[11px] text-white/70 font-medium">Tela cheia automática em 20s</span>
            </div>
          </button>
          </div>

          {/* Today's schedule (read-only) */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-white/[0.03]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Programação de hoje</span>
            </div>
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
      </div>

      {fullscreen && (
        <ChannelPlayer channel={selectedChannel} onClose={() => setFullscreen(false)} />
      )}
    </>
  )
}

// ─── CONFIGURAÇÕES TAB ────────────────────────────────────────────────────────
function ConfiguracoesTab() {
  const [notifications, setNotifications] = useState(USER.notifications)
  const [autoplay, setAutoplay] = useState(USER.autoplay)
  // This device's persistent key (read on the client to avoid SSR mismatch).
  const [deviceKey, setDeviceKey] = useState('····')

  useEffect(() => {
    setDeviceKey(getDeviceKey())
  }, [])

  function handleRegenerate() {
    if (
      window.confirm(
        'Gerar um novo código vai desconectar esta TV e exigir uma nova ativação. Deseja continuar?',
      )
    ) {
      setDeviceKey(regenerateDeviceKey())
    }
  }

  const accountRows = [
    { icon: User, label: 'Nome', value: USER.name },
    { icon: Mail, label: 'E-mail', value: USER.email },
    { icon: Crown, label: 'Plano', value: USER.plan },
    { icon: Calendar, label: 'Validade', value: USER.validity },
    { icon: Smartphone, label: 'Código do dispositivo', value: deviceKey },
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
            <button className="flex items-center gap-4 p-5 rounded-2xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 transition-colors text-left group shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-red-500/40">
              <div className="w-10 h-10 rounded-xl border border-red-500/30 bg-red-500/15 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300">Sair do aplicativo</p>
                <p className="text-xs text-red-400/70 mt-0.5">Encerrar sessão neste dispositivo</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/50 group-hover:text-red-400 transition-colors shrink-0" />
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

          {/* Device key — persistent per install, with option to generate a new one. */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card shadow-sm px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Código do dispositivo</p>
              <p className="text-lg font-black tracking-[0.06em] text-foreground tabular-nums mt-0.5">{deviceKey}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fixo para esta TV. Gere um novo apenas se precisar reativar.</p>
            </div>
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-accent/40 hover:bg-accent transition-colors text-sm font-semibold text-foreground shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            >
              <RefreshCw className="w-4 h-4" />
              Gerar novo código
            </button>
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

// ─── SHARED SEARCH INPUT ───────────────────────────────────���──────────────────
function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative ml-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-4 py-2 rounded-full bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-64 transition-colors" />
    </div>
  )
}

// ─── KIDS TAB ────────────────────────────────���────────────────────────────────
function KidsTab() {
  // KIDS_ITEMS is small; tile it into a fuller, playful grid.
  const tiles = [...KIDS_ITEMS, ...KIDS_ITEMS].slice(0, 8)
  const ageChips = ['Todos', '0-3 anos', '4-6 anos', '7-9 anos', '10-12 anos']
  const [age, setAge] = useState(ageChips[0])

  return (
    <>
      <ShellHeader title="Kids" />
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Playful banner */}
        <div className="relative overflow-hidden rounded-3xl p-7 mb-6 bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-cyan-900/30">
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3">
              <Smile className="w-3.5 h-3.5" /> Modo Kids
            </span>
            <h2 className="text-3xl font-black text-white text-balance leading-tight mb-1.5 drop-shadow">
              Diversão segura para os pequenos
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">
              Desenhos, aventuras e histórias selecionadas com controle parental ativo.
            </p>
          </div>
          {/* Decorative bubbles */}
          <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-white/10" aria-hidden />
          <div className="absolute right-24 bottom-0 w-24 h-24 rounded-full bg-white/10" aria-hidden />
        </div>

        {/* Age chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ageChips.map((c) => (
            <button
              key={c}
              onClick={() => setAge(c)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/50',
                age === c ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold text-primary mb-4">Programas favoritos</p>
        <div className="grid grid-cols-4 gap-4">
          {tiles.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              aria-label={`Assistir ${item.title}`}
              className="group/kid relative aspect-video rounded-3xl overflow-hidden outline-none shadow-md transition-transform duration-300 hover:scale-[1.04] focus-visible:scale-[1.04] focus-visible:ring-4 focus-visible:ring-primary/60"
              style={{ background: `linear-gradient(150deg, ${item.colorFrom} 0%, ${item.colorTo} 100%)` }}
            >
              {/* Play affordance */}
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg scale-75 opacity-0 transition-all duration-300 group-hover/kid:scale-100 group-hover/kid:opacity-100 group-focus-visible/kid:scale-100 group-focus-visible/kid:opacity-100">
                <Play className="w-6 h-6 text-teal-700 fill-current ml-0.5" />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white font-bold text-base leading-tight text-left text-balance drop-shadow">
                  {item.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
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

type AppStage = 'intro' | 'login' | 'loading' | 'app'

export default function AppShell() {
  const [active, setActive] = useState<TabId>('home')
  const [stage, setStage] = useState<AppStage>('intro')

  // TV-remote-style spatial navigation. Re-focuses when the active tab changes.
  // "Back" returns to Home (the modal handles its own Escape via capture phase).
  useTvNavigation({
    deps: [active, stage],
    onBack: () => setActive((cur) => (cur === 'home' ? cur : 'home')),
  })

  // Fire the "whoosh" transition cue the moment the catalog turns on.
  useEffect(() => {
    if (stage === 'app') playCue('open')
  }, [stage])

  if (stage === 'intro')
    return <IntroVideo onDone={() => setStage(isDeviceActivated() ? 'loading' : 'login')} />
  if (stage === 'login') return <LoginScreen onLogin={() => setStage('loading')} />
  if (stage === 'loading') return <LoadingScreen onDone={() => setStage('app')} />

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background animate-cp-power-on">
      {/* Sidebar — full on Início, slim icon-rail elsewhere (Claro TV+ style) */}
      <Sidebar active={active} onNav={setActive} collapsed={active !== 'home'} />

      <div className="flex flex-col flex-1 min-w-0 relative bg-background overflow-hidden">
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
              {tab === 'kids' && <KidsTab />}
              {tab === 'buscar' && <StubTab title="Buscar" />}
              {tab === 'favoritos' && <StubTab title="Favoritos" />}
            </div>
          </Activity>
        ))}
      </div>
    </div>
  )
}
