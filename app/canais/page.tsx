'use client'

import { useState } from 'react'
import { Play, Pause, Volume2, Maximize2, Star } from 'lucide-react'
import { TVLayout } from '@/components/tv/tv-layout'
import { CHANNELS, CHANNEL_CATEGORIES } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Channel } from '@/lib/types'

const DAYS = [
  { short: 'QUI', num: 15 },
  { short: 'SEX', num: 16 },
  { short: 'SÁB', num: 17 },
  { short: 'DOM', num: 18 },
  { short: 'SEG', num: 19 },
  { short: 'TER', num: 20 },
  { short: 'QUA', num: 21 },
]

export default function CanaisPage() {
  const [category, setCategory] = useState(CHANNEL_CATEGORIES[0])
  const [selectedChannel, setSelectedChannel] = useState<Channel>(CHANNELS[1])
  const [isPlaying, setIsPlaying] = useState(true)
  const [selectedDay, setSelectedDay] = useState(2)

  const filteredChannels = CHANNELS.filter(
    (c) => category === 'Esportes' ? c.category === 'Esportes' : true
  )

  return (
    <TVLayout>
      <div className="flex h-full overflow-hidden">

        {/* Category sidebar */}
        <aside className="flex flex-col shrink-0 py-4 gap-1 border-r border-border/30 overflow-y-auto" style={{ width: '180px' }}>
          {CHANNEL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors text-left',
                category === cat
                  ? 'bg-primary text-primary-foreground rounded-lg mx-2'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg mx-2'
              )}
            >
              {cat}
            </button>
          ))}
        </aside>

        {/* Channel list */}
        <div className="flex flex-col shrink-0 border-r border-border/30 overflow-y-auto" style={{ width: '240px' }}>
          <div className="px-3 py-3 border-b border-border/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Canais &bull; {category}
            </p>
          </div>
          {filteredChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch)}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 border-b border-border/20 text-left transition-colors',
                selectedChannel.id === ch.id
                  ? 'bg-primary/20 border-l-2 border-l-primary'
                  : 'hover:bg-accent'
              )}
            >
              <span className="text-xs text-muted-foreground w-8 shrink-0">{ch.number}</span>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: ch.logoColor }}
              >
                {ch.logoText}
              </div>
              <span className="text-sm text-foreground font-medium truncate">{ch.name}</span>
              <button
                className="ml-auto shrink-0 text-muted-foreground hover:text-yellow-400 transition-colors"
                aria-label="Favoritar canal"
                onClick={(e) => e.stopPropagation()}
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </div>

        {/* Player + EPG */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Canais</span>
            <span className="text-border">|</span>
            <span className="text-primary font-medium">{category}</span>
          </div>

          {/* Video player */}
          <div className="relative rounded-xl overflow-hidden bg-black border border-border/30 flex-1 max-h-64">
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, #0a1428 0%, #112040 100%)` }}
            >
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white mx-auto mb-2"
                  style={{ background: selectedChannel.logoColor }}
                >
                  {selectedChannel.logoText}
                </div>
                <p className="text-sm text-muted-foreground">{selectedChannel.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedChannel.currentProgram}</p>
              </div>
            </div>

            {/* Live badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              AO VIVO
            </div>

            {/* Player controls */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:text-primary transition-colors"
                  aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <Volume2 className="w-4 h-4 text-white/70" />
                <div className="flex-1 h-1 bg-white/20 rounded-full">
                  <div className="h-full w-3/5 bg-primary rounded-full" />
                </div>
                <span className="text-xs text-white/70">AO VIVO</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/30 text-white/70">HD</span>
                <Maximize2 className="w-4 h-4 text-white/70 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>

          {/* EPG */}
          <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
            <div className="flex flex-col divide-y divide-border/20">
              {selectedChannel.programs.map((prog) => (
                <div
                  key={prog.time}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3',
                    prog.isLive && 'bg-primary/10'
                  )}
                >
                  <span className="text-sm font-semibold text-foreground w-12 shrink-0">{prog.time}</span>
                  {prog.isLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
                  )}
                  <span className={cn('text-sm flex-1', prog.isLive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {prog.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {prog.time} – {prog.endTime}
                  </span>
                  {prog.isLive && (
                    <div className="h-1 w-32 bg-white/10 rounded-full shrink-0">
                      <div className="h-full w-1/2 bg-primary rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day navigator */}
        <aside className="flex flex-col shrink-0 border-l border-border/30 py-4 gap-1 overflow-y-auto" style={{ width: '72px' }}>
          {DAYS.map((d, i) => (
            <button
              key={d.num}
              onClick={() => setSelectedDay(i)}
              className={cn(
                'flex flex-col items-center py-3 mx-2 rounded-lg text-xs font-medium transition-colors',
                selectedDay === i
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span className="text-[10px] uppercase tracking-wider">{d.short}</span>
              <span className="text-base font-bold mt-0.5">{d.num}</span>
            </button>
          ))}
        </aside>

      </div>
    </TVLayout>
  )
}
