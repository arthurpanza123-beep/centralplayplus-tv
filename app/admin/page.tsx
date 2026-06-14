'use client'

import { useState } from 'react'
import { LayoutDashboard, MonitorSmartphone, Activity, Inbox } from 'lucide-react'
import { useAdminData } from '@/lib/admin/use-admin-data'
import { StatCards } from '@/components/admin/stat-cards'
import { ActivationPanel } from '@/components/admin/activation-panel'
import { DeviceTable } from '@/components/admin/device-table'
import { Monitoring } from '@/components/admin/monitoring'
import { ReportsInbox } from '@/components/admin/reports-inbox'

type Section = 'devices' | 'monitoring' | 'reports'

export default function AdminPage() {
  const { devices, stats, busyKey, activate, setBlocked, renew, changeProvider, playbackErrors, channelHealth } = useAdminData()
  const [section, setSection] = useState<Section>('devices')

  const tabs: { id: Section; label: string; icon: typeof MonitorSmartphone }[] = [
    { id: 'devices', label: 'Dispositivos', icon: MonitorSmartphone },
    { id: 'monitoring', label: 'Monitoramento', icon: Activity },
    { id: 'reports', label: 'Relatos', icon: Inbox },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/15 text-primary">
              <LayoutDashboard className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Central Play Plus · Ativações</h1>
              <p className="text-sm text-muted-foreground">Painel de ativação e monitoramento de dispositivos.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSection(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  section === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <StatCards stats={stats} />

        {section === 'devices' && (
          <div className="flex flex-col gap-6">
            <ActivationPanel onActivate={activate} busy={busyKey !== null} />
            <DeviceTable
              devices={devices}
              busyKey={busyKey}
              onBlock={setBlocked}
              onRenew={renew}
              onChangeProvider={changeProvider}
            />
          </div>
        )}
        {section === 'monitoring' && (
          <Monitoring devices={devices} errors={playbackErrors} health={channelHealth} />
        )}
        {section === 'reports' && <ReportsInbox />}
      </div>
    </main>
  )
}
