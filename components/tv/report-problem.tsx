'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react'
import { getDeviceKey } from '@/lib/activation'
import type { ReportKind } from '@/lib/reports'
import { cn } from '@/lib/utils'

interface ReportProblemProps {
  kind: ReportKind
  contentId: string
  contentTitle: string
  category?: string
  /** Estilo do gatilho: pílula clara (player de filme) ou compacto (canal). */
  variant?: 'pill' | 'ghost'
  className?: string
}

const REASONS = [
  'Tela preta / não abre',
  'Travando / engasgando',
  'Sem áudio',
  'Áudio fora de sincronia',
  'Imagem com erro',
  'Outro motivo',
]

/**
 * Botão "Não está funcionando" + modal de relato.
 * Envia o problema para /api/tv/report-problem → cai na caixa de entrada do /admin,
 * de onde o operador encaminha para a equipe de mídia.
 */
export function ReportProblem({ kind, contentId, contentTitle, category, variant = 'pill', className }: ReportProblemProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const firstBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setStatus('idle')
      setReason(null)
      const t = setTimeout(() => firstBtnRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // Fechar com Esc/Back sem propagar para a navegação global.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopImmediatePropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  async function submit(selectedReason: string) {
    setReason(selectedReason)
    setStatus('sending')
    try {
      const res = await fetch('/api/tv/report-problem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, contentId, contentTitle, category, reason: selectedReason, deviceKey: getDeviceKey() }),
      })
      setStatus(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(() => setOpen(false), 1800)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label="Relatar que não está funcionando"
        className={cn(
          'inline-flex items-center gap-2 font-semibold transition-all outline-none',
          variant === 'pill'
            ? 'px-5 py-3.5 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm hover:bg-amber-400/20 focus-visible:ring-4 focus-visible:ring-amber-400/40'
            : 'px-4 py-2 rounded-full border border-white/20 bg-black/55 text-white text-sm backdrop-blur-md hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-amber-400/60',
          className,
        )}
      >
        <AlertTriangle className="w-4 h-4" />
        Não está funcionando
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Relatar problema"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-cp-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl"
            >
              {status === 'sent' ? (
                <div className="flex flex-col items-center text-center gap-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-xl font-black text-foreground">Relato enviado!</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Avisamos a equipe responsável. Vamos corrigir o quanto antes. Obrigado!
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-foreground leading-tight">O que está acontecendo?</h2>
                        <p className="text-xs text-muted-foreground truncate max-w-[16rem]">{contentTitle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Fechar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 mt-5">
                    {REASONS.map((r, i) => (
                      <button
                        key={r}
                        ref={i === 0 ? firstBtnRef : undefined}
                        disabled={status === 'sending'}
                        onClick={() => submit(r)}
                        className={cn(
                          'flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:opacity-60',
                          reason === r && status === 'sending'
                            ? 'border-primary bg-primary/15 text-foreground'
                            : 'border-border bg-background hover:bg-accent text-foreground',
                        )}
                      >
                        {r}
                        {reason === r && status === 'sending' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      </button>
                    ))}
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-400 mt-4 text-center">
                      Não foi possível enviar agora. Verifique a conexão e tente de novo.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
