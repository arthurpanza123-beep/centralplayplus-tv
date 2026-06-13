'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function Topbar() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      )
      setDate(
        now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4" />
        <span className="font-medium text-foreground tabular-nums">{time}</span>
      </div>
      <span className="w-px h-4 bg-border" aria-hidden />
      <span className="capitalize">{date}</span>
    </div>
  )
}
