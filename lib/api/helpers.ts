/**
 * Helpers de API (SOMENTE BACKEND)
 * ------------------------------------------------------------------
 * Utilidades compartilhadas pelas rotas: respostas JSON padronizadas,
 * extração/validação do token do aparelho e do admin.
 *
 * Backend implementado pelo Codex.
 */

import { NextResponse } from 'next/server'
import type { ApiError } from '@/lib/types/tv'

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init)
}

export function apiError(code: string, message: string, status = 400): NextResponse {
  const body: ApiError = { error: { code, message } }
  return NextResponse.json(body, { status })
}

export function getDeviceToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7).trim() || null
}

export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) return false
  const headerKey = req.headers.get('x-admin-key')
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  return headerKey === expected || bearer === expected
}
