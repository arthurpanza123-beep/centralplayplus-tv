import { neon } from '@neondatabase/serverless'

/**
 * Cliente SQL do Neon (Postgres serverless).
 *
 * Use `sql` como template tag — os parâmetros são SEMPRE escapados
 * (proteção contra SQL injection):
 *
 *   const rows = await sql`SELECT * FROM tv_devices WHERE device_key = ${key}`
 *
 * O schema das tabelas de negócio está em scripts/001_schema.sql.
 * (O schema neon_auth/Better Auth é gerenciado pela integração e usado
 *  apenas para autenticar o painel /admin.)
 */
export const sql = neon(process.env.DATABASE_URL!)
