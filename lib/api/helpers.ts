/**
 * Helpers de API (SOMENTE BACKEND)
 * ------------------------------------------------------------------
 * Utilidades compartilhadas pelas rotas: respostas JSON padronizadas,
 * extração/validação do token do aparelho e do admin.
 *
 * Backend implementado pelo Codex — autenticação real é um TODO.
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

/**
 * Lê o Bearer token (token seguro do aparelho) do header Authorization.
 * TODO(Codex): validar assinatura/expiração contra device_tokens.
 */
export function getDeviceToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7).trim() || null
}

/**
 * Valida o token de admin do painel.
 * TODO(Codex): trocar por sessão/role real do painel administrativo.
 */
export function isAdmin(req: Request): boolean {
  const key = req.headers.get('x-admin-key')
  return !!key && key === process.env.ADMIN_API_KEY
}
