'use client'

import { memo, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Activity } from 'react'
import Image from 'next/image'
import {
  Home, Radio, Film, Tv2, Smile, Search, Heart, Settings, Crown,
  Play, Info, Star, Sparkles, HeartOff,
  Bell, Shield, MessageSquare, MonitorPlay, Monitor, ChevronRight, LogOut,
  User, Mail, Calendar, Smartphone, RefreshCw, CalendarClock,
} from 'lucide-react'
import { Topbar } from '@/components/tv/topbar'
import { ContentCard } from '@/components/tv/content-card'
import { ContentDetail } from '@/components/tv/content-detail'
import { ChannelPlayer } from '@/components/tv/channel-player'
import { MascotVideo } from '@/components/tv/mascot-video'
import { VirtualKeyboard } from '@/components/tv/virtual-keyboard'
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
      {/* Logo — mascot icon when collapsed, full wordmark when expanded */}
      <div className="flex items-center justify-center pt-7 pb-5 mb-2 border-b border-white/5 px-4">
        {collapsed ? (
          <div className="relative w-10 h-10 drop-shadow-[0_2px_12px_rgba(37,99,235,0.4)] transition-all duration-300 ease-out">
            <Image src="/mascot-icon.png" alt="Central Play Plus" fill className="object-contain" priority />
          </div>
        ) : (
          <div className="relative w-full h-12 drop-shadow-[0_2px_12px_rgba(37,99,235,0.35)] transition-all duration-300 ease-out">
            <Image src="/logo-central-play.png" alt="Central Play Plus" fill className="object-contain object-center" priority />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-2 overflow-y-auto overflow-x-hidden scrollbar-none', collapsed ? 'px-2.5' : 'px-3')} aria-label="Navegação principal">
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
      <div className={cn('relative pb-5', collapsed ? 'px-2.5' : 'px-3')}>
        {/* Mascot video tumbles once then freezes standing on top of the plan card */}
        {!collapsed && (
          <>
            {/* Soft contact shadow under the mascot's feet, resting on the card */}
            <span className="pointer-events-none absolute left-0 right-0 bottom-[70px] mx-auto w-16 h-2.5 rounded-[50%] bg-black/45 blur-[3px] z-10" aria-hidden />
            <MascotVideo className="pointer-events-none absolute left-0 right-0 bottom-[64px] mx-auto w-40 h-40 z-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]" />
          </>
        )}
        <button
          title={collapsed ? `${planTitle} · ${planSubtitle}` : undefined}
          aria-label={`${planTitle}, ${planSubtitle}`}
          className={cn(
            'relative z-10 group/plan w-full flex items-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/30 to-primary/10 hover:from-primary/40 hover:to-primary/15 transition-all text-left shadow-sm hover:shadow-md outline-none focus-visible:ring-4 focus-visible:ring-primary/40 backdrop-blur-sm',
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
          <div key={item.id} className="shrink-0 w-[184px]">
            <ContentCard item={item} onClick={onSelect} />
          </div>
        ))}
      </div>
    </section>
  )
})

function HomeTab({ onNav }: { onNav: (id: TabId) => void }) {
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const featured = MOVIES[2]

  // Cores vivas para o hero — independentes das cores escuras dos cards
  const heroColors = [
    { from: '#0f4c96', to: '#1e90e8' },   // azul oceano — "Sobre as Ondas"
    { from: '#7c2d12', to: '#dc6a1a' },   // laranja épico
    { from: '#134e4a', to: '#14b8a6' },   // verde-azulado
    { from: '#3b0764', to: '#7c3aed' },   // roxo espacial
  ]
  const hero = heroColors[2 % heroColors.length] // índice alinhado ao MOVIES[2]

  const handleSelect = useCallback((item: Movie | Series) => setSelected(item), [])
  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none">
      {/* ── Relógio flutuante ── */}
      <div className="absolute top-4 right-6 z-30 pointer-events-none">
        <Topbar />
      </div>

      {/* ── Card de destaque principal (cinematic) ── */}
      <section
        className="relative w-full overflow-hidden flex flex-col justify-end"
        style={{ height: '52vh', minHeight: 320 }}
      >
        {/* Fundo principal vibrante */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${hero.from} 0%, ${hero.to} 100%)` }}
        />
        {/* Brilho radial no centro-direito */}
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: `radial-gradient(ellipse 65% 75% at 72% 38%, ${hero.to}cc 0%, transparent 65%)` }}
        />
        {/* Padrão geométrico sutil */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '24px 24px' }} />
        {/* Vinhetas para emergir o texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-transparent" />

        {/* Infos do destaque */}
        <div className="absolute inset-0 flex flex-col justify-end pb-10 px-8 max-w-2xl gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-primary/20 text-primary border border-primary/30 w-fit">
            DESTAQUE
          </span>
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
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => handleSelect(featured)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-md bg-white text-black text-base font-bold hover:bg-white/85 hover:scale-[1.03] transition-all outline-none focus:ring-2 focus:ring-white"
            >
              <Play className="w-5 h-5 fill-current" />Assistir
            </button>
            <button
              onClick={() => handleSelect(featured)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-md bg-white/15 text-white text-base font-bold backdrop-blur-sm hover:bg-white/25 transition-all outline-none focus:ring-2 focus:ring-white"
            >
              <Info className="w-5 h-5" />Mais informações
            </button>
          </div>
        </div>
      </section>

      {/* ── Fileiras de conteúdo ── */}
      <div className="relative z-10 flex flex-col gap-9 mt-2 pb-10">
        <PosterRow title="Em alta hoje" items={MOVIES.slice(0, 12)} onSelect={handleSelect} />
        <PosterRow title="Continue assistindo" items={MOVIES.slice(10, 20)} onSelect={handleSelect} />
        <PosterRow title="Séries em destaque" items={SERIES.slice(0, 12)} onSelect={handleSelect} />
        <PosterRow title="Filmes em destaque" items={MOVIES.slice(4, 16)} onSelect={handleSelect} />
        <PosterRow title="Lançamentos" items={MOVIES.slice(16).concat(MOVIES.slice(0, 4))} onSelect={handleSelect} />
        <PosterRow title="Para a família" items={SERIES.slice(6, 18)} onSelect={handleSelect} />
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
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
          <p className="text-sm font-semibold text-primary mb-4">{category}</p>
          {filtered.length > 0
            ? <div className="grid grid-cols-5 gap-5">{filtered.map((m) => <ContentCard key={m.id} item={m} onClick={handleSelect} />)}</div>
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
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
          <p className="text-sm font-semibold text-primary mb-4">{category}</p>
          {filtered.length > 0
            ? <div className="grid grid-cols-5 gap-5">{filtered.map((s) => <ContentCard key={s.id} item={s} onClick={handleSelect} />)}</div>
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
    () => CHANNELS.filter((c) => (category === 'Todos' ? true : c.category === category)),
    [category],
  )

  // Channel-name flash overlay shown briefly whenever the channel changes.
  const [showNameFlash, setShowNameFlash] = useState(false)
  // Auto-zoom: only after 30s of true inactivity (no scrolling / channel changes).
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TV behavior: first click on a channel just shows the small preview; clicking
  // the SAME channel a second time expands it to fullscreen. We track the last
  // clicked id in a ref so the very first click never zooms (even the default one).
  const lastClickedId = useRef<string | null>(null)
  const handleChannelClick = useCallback((ch: Channel) => {
    if (lastClickedId.current === ch.id) {
      setFullscreen(true)
    } else {
      lastClickedId.current = ch.id
      setSelectedChannel(ch)
    }
  }, [])
  // Clicking the preview itself always expands to fullscreen.
  const openChannel = useCallback((ch: Channel) => {
    setSelectedChannel(ch)
    setFullscreen(true)
  }, [])

  // Flash the channel name on every change of the selected channel.
  useEffect(() => {
    setShowNameFlash(true)
    const t = setTimeout(() => setShowNameFlash(false), 2400)
    return () => clearTimeout(t)
  }, [selectedChannel])

  // (Re)start the 30s idle countdown; expands to fullscreen only when it elapses.
  // Any scroll / channel change / interaction calls this and resets the count.
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (fullscreen) return
    idleTimer.current = setTimeout(() => setFullscreen(true), 30000)
  }, [fullscreen])

  // Reset the idle timer whenever the channel changes or we leave fullscreen.
  useEffect(() => {
    resetIdle()
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
  }, [resetIdle, selectedChannel])

  return (
    <>
      <ShellHeader />
      <div
        className="flex flex-1 overflow-hidden bg-background"
        onWheelCapture={resetIdle}
        onScrollCapture={resetIdle}
        onMouseMoveCapture={resetIdle}
        onKeyDownCapture={resetIdle}
      >
        {/* Category column — big, TV-sized */}
        <aside className="flex flex-col shrink-0 py-4 gap-1.5 border-r border-border overflow-y-auto scrollbar-none" style={{ width: 240 }}>
          {CHANNEL_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn('flex items-center px-5 py-3.5 mx-3 rounded-xl text-lg font-semibold transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                category === cat ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
              {cat}
            </button>
          ))}
        </aside>

        {/* Channel list — big icons + titles */}
        <div className="flex flex-col shrink-0 border-r border-border overflow-y-auto scrollbar-none" style={{ width: 340 }}>
          <div className="px-5 py-4 border-b border-border shrink-0">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Canais &bull; {category}</p>
          </div>
          {filteredChannels.map((ch) => (
            <div key={ch.id} role="button" tabIndex={0}
              onClick={() => handleChannelClick(ch)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChannelClick(ch) } }}
              className={cn('group/ch relative flex items-center gap-4 px-5 py-4 border-b border-border/60 text-left transition-all duration-300 cursor-pointer outline-none overflow-hidden shrink-0',
                selectedChannel.id === ch.id
                  ? 'bg-primary/15 shadow-[inset_0_0_24px_rgba(37,99,235,0.25)]'
                  : 'hover:bg-accent')}>
              {/* Animated active accent bar (blue/white) */}
              {selectedChannel.id === ch.id && (
                <span className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-cyan-300 via-primary to-cyan-300 bg-[length:100%_200%] animate-cp-accent-slide shadow-[0_0_12px_rgba(37,99,235,0.9)]" />
              )}
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 shadow-md transition-all duration-300',
                selectedChannel.id === ch.id && 'ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-card scale-105')}
                style={{ background: ch.logoColor }}>
                {ch.logoText}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className={cn('text-lg font-bold truncate transition-colors', selectedChannel.id === ch.id ? 'text-white' : 'text-foreground')}>{ch.name}</span>
                <span className="text-sm text-muted-foreground truncate">{ch.currentProgram}</span>
              </div>
              {selectedChannel.id === ch.id && (
                <span className="flex items-end gap-0.5 h-5 shrink-0" aria-label="No ar">
                  <span className="w-1 bg-cyan-300 rounded-full animate-cp-eq-1" />
                  <span className="w-1 bg-white rounded-full animate-cp-eq-2" />
                  <span className="w-1 bg-primary rounded-full animate-cp-eq-3" />
                  <span className="w-1 bg-cyan-300 rounded-full animate-cp-eq-2" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Player + EPG — fills the remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-w-0">
          {/* Channel name on the LEFT, above the preview */}
          <div className="flex items-baseline gap-3 min-w-0 shrink-0">
            <h2 className="text-3xl font-black text-foreground truncate">{selectedChannel.name}</h2>
            <span className="text-base text-muted-foreground shrink-0">{selectedChannel.category}</span>
          </div>

          {/* Large preview — fills width and most of the height */}
          <div className="flex-[3] min-h-0" onMouseMove={resetIdle}>
          <button
            onClick={() => openChannel(selectedChannel)}
            aria-label={`Abrir ${selectedChannel.name} em tela cheia`}
            className="group/prev relative h-full w-full rounded-2xl overflow-hidden border border-border shadow-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/60 transition-transform duration-300 hover:scale-[1.005]"
          >
            {/* Clean, dark backdrop — focus stays on the channel feed */}
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(155deg, ${selectedChannel.logoColor}26 0%, #070b14 72%)` }}
            />

            {/* Channel-name popup — bottom-left, "skip intro" style, fades quickly */}
            {showNameFlash && (
              <div key={selectedChannel.id} className="absolute bottom-4 left-4 animate-cp-name-flash">
                <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 backdrop-blur-md ring-1 ring-white/15 text-white text-base font-bold shadow-lg">
                  {selectedChannel.name}
                </span>
              </div>
            )}

          </button>
          </div>

          {/* EPG — compact program guide below the preview */}
          <div className="flex-[2] min-h-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
              <CalendarClock className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Guia de programação</span>
            </div>
            <div className="overflow-y-auto scrollbar-none">
              {selectedChannel.programs.map((prog, i) => {
                const next = !prog.isLive && (i === 0 || selectedChannel.programs[i - 1]?.isLive)
                return (
                  <div key={prog.time} className={cn('flex items-center gap-4 px-5 py-3 border-b border-border/60 last:border-0 transition-colors', prog.isLive ? 'bg-primary/10' : 'hover:bg-accent/40')}>
                    <span className={cn('text-base font-semibold w-14 shrink-0', prog.isLive ? 'text-primary' : 'text-foreground')}>{prog.time}</span>
                    {prog.isLive ? (
                      <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold shrink-0 w-16 text-center">AGORA</span>
                    ) : next ? (
                      <span className="px-2 py-0.5 rounded bg-white/10 text-muted-foreground text-[10px] font-bold shrink-0 w-16 text-center">A SEGUIR</span>
                    ) : (
                      <span className="w-16 shrink-0" />
                    )}
                    <span className={cn('text-base flex-1 truncate', prog.isLive ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{prog.title}</span>
                    <span className="text-sm text-muted-foreground shrink-0 hidden md:block">{prog.time} – {prog.endTime}</span>
                  </div>
                )
              })}
            </div>
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
                    className={cn('relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-300 ease-out shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-primary/40', value ? 'bg-primary' : 'bg-muted')}>
                    <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-out', value ? 'translate-x-6' : 'translate-x-1')} />
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
// On a TV there is no physical text field, so tapping the search opens an on-screen
// keyboard. Typing filters the results live behind the overlay.
function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative ml-4 flex items-center gap-2 pl-9 pr-4 py-2 rounded-full bg-background border border-border w-64 text-left transition-colors hover:border-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <span className={cn('text-sm truncate', value ? 'text-foreground' : 'text-muted-foreground')}>
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={placeholder}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl mb-10 mx-4 rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-muted-foreground">{placeholder}</p>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40"
              >
                Concluir
              </button>
            </div>
            {/* Query display */}
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 mb-4">
              <Search className="w-5 h-5 text-primary shrink-0" />
              <span className={cn('text-xl font-semibold truncate', value ? 'text-foreground' : 'text-muted-foreground')}>
                {value || 'Digite para buscar…'}
              </span>
              {value && <span className="ml-auto w-0.5 h-6 bg-primary animate-pulse shrink-0" aria-hidden />}
            </div>
            <VirtualKeyboard value={value} onChange={onChange} />
          </div>
        </div>
      )}
    </>
  )
}

// ─── KIDS TAB ────────────────────────────────���────────────────────────────────
const KIDS_CATEGORIES = ['Destaques', 'Canais', 'Filmes', 'Séries']

function KidsTab() {
  const [category, setCategory] = useState(KIDS_CATEGORIES[0])
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const [channel, setChannel] = useState<(typeof CHANNELS)[number] | null>(null)
  const handleSelect = useCallback((i: Movie | Series) => setSelected(i), [])
  const handleClose = useCallback(() => setSelected(null), [])

  const kidsChannels = useMemo(() => CHANNELS.filter((c) => c.category === 'Desenhos'), [])
  const kidsMovies = useMemo(() => MOVIES.slice(0, 15), [])
  const kidsSeries = useMemo(() => SERIES.slice(0, 15), [])

  return (
    <>
      <ShellHeader title="Kids" />
      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar categories={KIDS_CATEGORIES} selected={category} onSelect={setCategory} />
        <div className="flex-1 overflow-y-auto scrollbar-none pb-10 bg-gradient-to-b from-sky-500/10 via-fuchsia-500/[0.05] to-transparent">

          {/* ── DESTAQUES ── */}
          {category === 'Destaques' && (
            <>
              <div className="px-6 pt-5">
                <div className="relative overflow-hidden rounded-[2rem] p-8 mb-8 shadow-2xl shadow-fuchsia-900/30"
                  style={{ background: 'linear-gradient(120deg, #f472b6 0%, #a855f7 38%, #38bdf8 72%, #22d3ee 100%)' }}>
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/30 blur-xl animate-cp-kid-shine" />
                  <Sparkles aria-hidden className="absolute top-6 right-10 w-7 h-7 text-white/90 animate-cp-kid-twinkle" />
                  <Sparkles aria-hidden className="absolute bottom-8 right-32 w-5 h-5 text-white/80 animate-cp-kid-twinkle" style={{ animationDelay: '0.8s' }} />
                  <Sparkles aria-hidden className="absolute top-16 right-52 w-4 h-4 text-white/70 animate-cp-kid-twinkle" style={{ animationDelay: '1.4s' }} />
                  <div className="relative z-10 max-w-lg">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/25 backdrop-blur-sm text-white text-sm font-bold mb-3">
                      <Smile className="w-4 h-4" /> Modo Kids
                    </span>
                    <h2 className="text-4xl font-black text-white text-balance leading-tight mb-2 drop-shadow-md">
                      Diversão segura para os pequenos
                    </h2>
                    <p className="text-base text-white/90 leading-relaxed">
                      Desenhos, filmes e séries divertidas, só para as crianças.
                    </p>
                  </div>
                  <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/15" aria-hidden />
                  <div className="absolute right-28 bottom-2 w-28 h-28 rounded-full bg-white/15" aria-hidden />
                  <div className="absolute right-6 -bottom-10 w-36 h-36 rounded-full bg-white/10" aria-hidden />
                </div>
              </div>

              <div className="px-6">
                <p className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-fuchsia-400" /> Programas favoritos
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {KIDS_ITEMS.map((item, i) => (
                    <button
                      key={item.id}
                      aria-label={`Assistir ${item.title}`}
                      className="group/kid animate-cp-kid-float relative aspect-video rounded-[1.75rem] overflow-hidden outline-none transition-transform duration-300 hover:scale-[1.05] focus:scale-[1.05] focus:ring-4 focus:ring-white/80"
                      style={{ animationDelay: `${(i % 3) * 0.5}s`, boxShadow: `0 10px 30px -6px ${item.colorTo}aa` }}
                    >
                      <Image src={`/kids/${item.id}.png`} alt={item.title} fill sizes="(max-width: 768px) 50vw, 30vw" className="object-cover" />
                      <span className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-2 ring-white/0 group-hover/kid:ring-white/60 transition-all duration-300" aria-hidden />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl scale-75 opacity-0 transition-all duration-300 group-hover/kid:scale-100 group-hover/kid:opacity-100 group-focus/kid:scale-100 group-focus/kid:opacity-100">
                        <Play className="w-7 h-7 text-pink-600 fill-current ml-0.5" />
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 to-transparent">
                        <p className="text-white font-black text-lg leading-tight text-left text-balance drop-shadow-md">
                          {item.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── CANAIS ── */}
          {category === 'Canais' && (
            <div className="px-6 py-5">
              <p className="text-lg font-black text-foreground mb-4">Canais infantis</p>
              {kidsChannels.length > 0 ? (
                <div className="grid grid-cols-3 gap-5">
                  {kidsChannels.map((ch) => (
                    <button key={ch.id}
                      onClick={() => setChannel(ch)}
                      aria-label={`Assistir ${ch.name}`}
                      className="group/kch text-left rounded-3xl p-5 flex flex-col gap-4 shadow-lg outline-none transition-transform duration-300 hover:scale-[1.04] focus:scale-[1.04] focus:ring-4 focus:ring-white/80"
                      style={{ background: `linear-gradient(150deg, ${ch.logoColor} 0%, ${ch.logoColor}99 100%)` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-black text-white shrink-0">
                          {ch.logoText}
                        </div>
                        <span className="text-white font-black text-lg leading-tight">{ch.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold shrink-0 ring-2 ring-white/80">
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />AO VIVO
                        </span>
                        <span className="truncate">{ch.currentProgram}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhum canal infantil disponível.</div>
              )}
            </div>
          )}

          {/* ── FILMES ── */}
          {category === 'Filmes' && (
            <div className="px-6 py-5">
              <p className="text-lg font-black text-foreground mb-4">Filmes para crianças</p>
              <div className="grid grid-cols-5 gap-5">
                {kidsMovies.map((m) => <ContentCard key={m.id} item={m} onClick={handleSelect} />)}
              </div>
            </div>
          )}

          {/* ── SÉRIES ── */}
          {category === 'Séries' && (
            <div className="px-6 py-5">
              <p className="text-lg font-black text-foreground mb-4">Séries para crianças</p>
              <div className="grid grid-cols-5 gap-5">
                {kidsSeries.map((s) => <ContentCard key={s.id} item={s} onClick={handleSelect} />)}
              </div>
            </div>
          )}
        </div>
      </div>
      <ContentDetail item={selected} onClose={handleClose} />
      <ChannelPlayer channel={channel} onClose={() => setChannel(null)} />
    </>
  )
}

// ─── BUSCAR TAB ───────────────────────────────────────────────────────────────
function BuscarTab() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const handleSelect = useCallback((i: Movie | Series) => setSelected(i), [])
  const handleClose = useCallback(() => setSelected(null), [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return [...MOVIES, ...SERIES]
      .filter((i) => i.title.toLowerCase().includes(q) || i.genre.toLowerCase().includes(q))
      .slice(0, 30)
  }, [query])

  const trending = useMemo(() => MOVIES.slice(0, 12), [])

  return (
    <>
      <ShellHeader title="Buscar" />
      <div className="flex flex-1 overflow-hidden gap-6 px-6 pb-6">
        {/* Keyboard card */}
        <div className="shrink-0 w-[520px] flex flex-col gap-4">
          {/* Query display */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <span className={cn('text-xl font-semibold truncate', query ? 'text-foreground' : 'text-muted-foreground')}>
              {query || 'Digite para buscar…'}
            </span>
            {query && <span className="ml-auto w-0.5 h-6 bg-primary animate-pulse shrink-0" aria-hidden />}
          </div>
          {/* On-screen keyboard */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <VirtualKeyboard value={query} onChange={setQuery} />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-none min-w-0">
          <p className="text-sm font-semibold text-primary mb-4">
            {query ? `${results.length} resultado${results.length === 1 ? '' : 's'} para “${query}”` : 'Em alta agora'}
          </p>
          {query && results.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhum título encontrado.</div>
          ) : (
            <div className="grid grid-cols-4 gap-5">
              {(query ? results : trending).map((i) => (
                <ContentCard key={i.id} item={i} onClick={handleSelect} />
              ))}
            </div>
          )}
        </div>
      </div>
      <ContentDetail item={selected} onClose={handleClose} />
    </>
  )
}

// ─── FAVORITOS TAB ────────────────────────────────────────────────────────────
function FavoritosTab() {
  const [selected, setSelected] = useState<Movie | Series | null>(null)
  const handleSelect = useCallback((i: Movie | Series) => setSelected(i), [])
  const handleClose = useCallback(() => setSelected(null), [])

  // Everything the user has marked as favorite (curated demo selection).
  const favorites = useMemo(() => [...MOVIES.slice(0, 7), ...SERIES.slice(0, 7)], [])

  return (
    <>
      <ShellHeader title="Favoritos" />
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-4">
        {favorites.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-primary mb-4">{favorites.length} títulos salvos</p>
            <div className="grid grid-cols-5 gap-5">
              {favorites.map((i) => <ContentCard key={i.id} item={i} onClick={handleSelect} />)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <HeartOff className="w-12 h-12 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">Nenhum favorito ainda</p>
            <p className="text-sm text-muted-foreground max-w-xs">Toque no coração de um título para salvá-lo aqui.</p>
          </div>
        )}
      </div>
      <ContentDetail item={selected} onClose={handleClose} />
    </>
  )
}

// ─── ROOT SHELL ────────────────────────────��─────────────���────────────────────
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
              {tab === 'buscar' && <BuscarTab />}
              {tab === 'favoritos' && <FavoritosTab />}
            </div>
          </Activity>
        ))}
      </div>
    </div>
  )
}
