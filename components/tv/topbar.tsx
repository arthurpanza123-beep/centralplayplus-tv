'use client'

import { useState, useEffect, memo } from 'react'
import { Clock } from 'lucide-react'

// Isolated so the 1s tick NEVER re-renders parent components
export const Topbar = memo(function Topbar() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      const newTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const newDate = now.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      setTime(newTime)
      setDate(newDate)
    }
    update()
    // Sync to the next full minute boundary so we only tick 60x/min instead of every second
    const now = new Date()
    const msToNextMin = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    const timeout = setTimeout(() => {
      update()
      const id = setInterval(update, 60_000)
      return () => clearInterval(id)
    }, msToNextMin)
    return () => clearTimeout(timeout)
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
})
