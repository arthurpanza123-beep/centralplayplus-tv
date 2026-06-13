'use client'

import { useEffect } from 'react'
import { playCue, unlockAudio } from '@/lib/sounds'

type Dir = 'up' | 'down' | 'left' | 'right'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  // ignore elements that are off-screen (e.g. hidden tabs translated away)
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return false

  // Walk up ancestors: hidden tabs use opacity:0 + pointer-events:none, so any
  // ancestor that is non-interactive or invisible disqualifies the element.
  let node: HTMLElement | null = el
  while (node) {
    const style = window.getComputedStyle(node)
    if (
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      style.opacity === '0' ||
      style.pointerEvents === 'none'
    ) {
      return false
    }
    node = node.parentElement
  }
  return true
}

function getFocusable(): HTMLElement[] {
  // If a modal dialog is open, trap focus inside it.
  const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
  const root: ParentNode = dialog ?? document
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible)
}

interface Point {
  x: number
  y: number
}

function center(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/**
 * Pick the best candidate in the given direction from the active element.
 * Scoring favors elements directly aligned in the travel direction and close by.
 */
function findNext(current: HTMLElement, dir: Dir, candidates: HTMLElement[]): HTMLElement | null {
  const curRect = current.getBoundingClientRect()
  const cur = center(curRect)

  let best: HTMLElement | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const el of candidates) {
    if (el === current) continue
    const rect = el.getBoundingClientRect()
    const c = center(rect)
    const dx = c.x - cur.x
    const dy = c.y - cur.y

    // Must be in the correct half-plane, using rect edges for robustness.
    let primary = 0 // distance along travel axis (must be > 0)
    let cross = 0 // misalignment on the perpendicular axis
    switch (dir) {
      case 'up':
        if (rect.bottom > curRect.top - 1) continue
        primary = cur.y - c.y
        cross = Math.abs(dx)
        break
      case 'down':
        if (rect.top < curRect.bottom + 1) continue
        primary = c.y - cur.y
        cross = Math.abs(dx)
        break
      case 'left':
        if (rect.right > curRect.left - 1) continue
        primary = cur.x - c.x
        cross = Math.abs(dy)
        break
      case 'right':
        if (rect.left < curRect.right + 1) continue
        primary = c.x - cur.x
        cross = Math.abs(dy)
        break
    }
    if (primary <= 0) continue

    // Weight cross-axis misalignment heavily so we prefer aligned neighbors.
    const score = primary + cross * 2.5
    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

function focusEl(el: HTMLElement) {
  el.focus({ preventScroll: true })
  // Keep the focused item comfortably in view — centered like a real TV UI.
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
}

/**
 * Enables TV-remote-style spatial navigation:
 *  - Arrow keys move focus to the nearest element in that direction
 *  - Enter / Space activate (native button behavior)
 *  - Escape / Backspace trigger the optional onBack handler
 *
 * `deps` lets callers re-run the initial-focus logic when the screen changes.
 */
export function useTvNavigation(options?: { onBack?: () => void; deps?: unknown[] }) {
  const onBack = options?.onBack
  const deps = options?.deps ?? []

  // Ensure something is focused when the screen mounts/changes.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const active = document.activeElement as HTMLElement | null
      if (!active || active === document.body || !isVisible(active)) {
        const first = getFocusable()[0]
        if (first) focusEl(first)
      }
    }, 120)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Any key press unlocks the audio context on strict browsers.
      unlockAudio()

      // Let text inputs handle their own arrow/typing behavior.
      const target = e.target as HTMLElement | null
      const isTextField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      // Confirm sound on activation.
      if ((e.key === 'Enter' || e.key === ' ') && !isTextField) {
        playCue('select')
      }

      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && isTextField) return
        if (onBack) {
          e.preventDefault()
          playCue('back')
          onBack()
        }
        return
      }

      const dirMap: Record<string, Dir> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const dir = dirMap[e.key]
      if (!dir) return

      // Inside a text field, let left/right move the caret.
      if (isTextField && (dir === 'left' || dir === 'right')) return

      const candidates = getFocusable()
      if (candidates.length === 0) return

      const active = document.activeElement as HTMLElement | null
      const current = active && candidates.includes(active) ? active : candidates[0]

      const next = findNext(current, dir, candidates)
      if (next) {
        e.preventDefault()
        playCue('nav')
        focusEl(next)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onBack])
}
