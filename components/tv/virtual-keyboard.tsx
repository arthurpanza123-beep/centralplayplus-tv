'use client'

import { memo, useEffect } from 'react'
import { Delete, X, Space } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

/**
 * On-screen keyboard for TV search. Also listens to the physical / TV remote
 * keyboard so the user can type with whichever they prefer.
 */
export const VirtualKeyboard = memo(function VirtualKeyboard({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  // Mirror the hardware keyboard onto the same query.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        onChange(value.slice(0, -1))
      } else if (e.key.length === 1 && /[a-z0-9 ]/i.test(e.key)) {
        e.preventDefault()
        onChange(value + e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onChange])

  const append = (k: string) => onChange(value + k.toLowerCase())

  const keyBase =
    'flex items-center justify-center rounded-xl bg-white/[0.06] text-foreground font-bold text-xl h-14 transition-all outline-none hover:bg-primary hover:text-primary-foreground hover:scale-105 focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-95'

  return (
    <div className="flex flex-col gap-2.5 select-none">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-2.5 justify-center">
          {row.map((k) => (
            <button key={k} onClick={() => append(k)} className={cn(keyBase, 'w-14')} aria-label={`Tecla ${k}`}>
              {k}
            </button>
          ))}
        </div>
      ))}
      {/* Bottom action row */}
      <div className="flex gap-2.5 justify-center">
        <button onClick={() => append(' ')} className={cn(keyBase, 'flex-1 gap-2')} aria-label="Espaço">
          <Space className="w-5 h-5" /> Espaço
        </button>
        <button
          onClick={() => onChange(value.slice(0, -1))}
          className={cn(keyBase, 'w-28 gap-2 hover:bg-amber-500 focus-visible:bg-amber-500')}
          aria-label="Apagar"
        >
          <Delete className="w-5 h-5" /> Apagar
        </button>
        <button
          onClick={() => onChange('')}
          className={cn(keyBase, 'w-28 gap-2 hover:bg-red-600 focus-visible:bg-red-600')}
          aria-label="Limpar"
        >
          <X className="w-5 h-5" /> Limpar
        </button>
      </div>
    </div>
  )
})
