'use client'

import { useState } from 'react'
import {
  Bell,
  Shield,
  MessageSquare,
  MonitorPlay,
  Play,
  Monitor,
  ChevronRight,
  LogOut,
  User,
  Mail,
  Crown,
  Calendar,
  Smartphone,
} from 'lucide-react'
import { TVLayout } from '@/components/tv/tv-layout'
import { USER } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function ConfiguracoesPage() {
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
    {
      icon: Bell,
      label: 'Notificações',
      description: 'Receba novidades e alertas',
      type: 'toggle' as const,
      value: notifications,
      onToggle: () => setNotifications((v) => !v),
    },
    {
      icon: Shield,
      label: 'Controle parental',
      description: `Filtragem de conteúdo: ${USER.parentalControl}`,
      type: 'chevron' as const,
    },
    {
      icon: MessageSquare,
      label: 'Idioma',
      description: USER.language,
      type: 'chevron' as const,
    },
    {
      icon: MonitorPlay,
      label: 'Qualidade de vídeo',
      description: `${USER.videoQuality} (Recomendada)`,
      type: 'chevron' as const,
    },
    {
      icon: Play,
      label: 'Reprodução automática',
      description: 'Próximo episódio em 5 segundos',
      type: 'toggle' as const,
      value: autoplay,
      onToggle: () => setAutoplay((v) => !v),
    },
    {
      icon: Monitor,
      label: 'Dispositivos conectados',
      description: `${USER.connectedDevices} dispositivos conectados nesta conta`,
      type: 'chevron' as const,
    },
  ]

  return (
    <TVLayout title="Configurações">
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-4xl flex flex-col gap-4">

          {/* Top row: account + logout */}
          <div className="grid grid-cols-3 gap-4">
            {/* Account card */}
            <div className="col-span-2 rounded-xl border border-border/40 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/30">
                <p className="text-sm font-semibold text-primary">Sua conta</p>
              </div>
              <div className="flex flex-col">
                {accountRows.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-border/20 last:border-0"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground flex-1">{label}</span>
                    <span className="text-sm text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout card */}
            <button className="flex items-center gap-4 p-5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15 transition-colors text-left group">
              <div className="w-10 h-10 rounded-lg border border-orange-500/40 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-300">Sair do aplicativo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Encerrar sessão neste dispositivo</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400/60 group-hover:text-orange-400 transition-colors shrink-0" />
            </button>
          </div>

          {/* Settings rows */}
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            {settingsRows.map(({ icon: Icon, label, description, type, value, onToggle }, i) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-4 px-5 py-4 border-b border-border/20 last:border-0',
                  type === 'chevron' && 'cursor-pointer hover:bg-accent/50 transition-colors'
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                {type === 'toggle' ? (
                  <button
                    role="switch"
                    aria-checked={value}
                    onClick={onToggle}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      value ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                        value ? 'translate-x-[22px]' : 'translate-x-0.5'
                      )}
                    />
                    <span className="sr-only">{value ? 'Ativado' : 'Desativado'}</span>
                  </button>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Footer bar */}
          <div className="grid grid-cols-3 rounded-xl border border-border/30 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-r border-border/30">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Versão do app</p>
                <p className="text-sm font-semibold text-foreground">{USER.appVersion}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-r border-border/30">
              <Crown className="w-4 h-4 text-yellow-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{USER.plan}</p>
                <p className="text-sm font-semibold text-foreground">Ativo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Validade</p>
                <p className="text-sm font-semibold text-foreground">{USER.validity}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </TVLayout>
  )
}
