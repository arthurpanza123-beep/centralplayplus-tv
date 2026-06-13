'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Home,
  Radio,
  Film,
  Tv2,
  Smile,
  Search,
  Heart,
  Settings,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/canais', label: 'Canais', icon: Radio },
  { href: '/filmes', label: 'Filmes', icon: Film },
  { href: '/series', label: 'Séries', icon: Tv2 },
  { href: '/kids', label: 'Kids', icon: Smile },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0"
      style={{ width: 'var(--tv-sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="relative w-10 h-10 shrink-0">
          <Image
            src="/mascot.png"
            alt="Central Play mascote"
            fill
            className="object-contain"
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase">
            Central
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-foreground tracking-tight">
              PLAY
            </span>
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
              PLUS
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Navegação principal">
        <ul className="flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Plan badge */}
      <div className="px-3 pb-5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold text-yellow-300 truncate">
              Plano ativado
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Diversão sem limites
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
