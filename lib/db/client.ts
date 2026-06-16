import { Pool } from 'pg'

/**
 * Cliente SQL Postgres local/remoto via node-postgres.
 *
 * Mantém o mesmo uso como template tag:
 *
 *   const rows = await sql`SELECT * FROM tv_devices WHERE device_key = ${key}`
 *
 * Os valores interpolados viram parâmetros $1, $2, ...
 * Isso mantém proteção contra SQL injection.
 */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL)

type SqlRow = Record<string, unknown>

export type SqlClient = {
  <T extends SqlRow = SqlRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>

  query<T extends SqlRow = SqlRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]>

  execute<T extends SqlRow = SqlRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]>
}

let pool: Pool | null = null

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurado.')
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }

  return pool
}

function buildParameterizedQuery(
  strings: TemplateStringsArray,
  values: unknown[]
): { text: string; params: unknown[] } {
  let text = ''

  for (let i = 0; i < strings.length; i += 1) {
    text += strings[i]

    if (i < values.length) {
      text += `$${i + 1}`
    }
  }

  return {
    text,
    params: values,
  }
}

function missingDatabase(): SqlClient {
  const fn = async () => {
    throw new Error('DATABASE_URL não configurado.')
  }

  return Object.assign(fn, {
    query: fn,
    execute: fn,
  }) as unknown as SqlClient
}

function createSqlClient(): SqlClient {
  const tag = async <T extends SqlRow = SqlRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    const { text, params } = buildParameterizedQuery(strings, values)
    const result = await getPool().query<T>(text, params)
    return result.rows
  }

  const query = async <T extends SqlRow = SqlRow>(
    text: string,
    params: unknown[] = []
  ): Promise<T[]> => {
    const result = await getPool().query<T>(text, params)
    return result.rows
  }

  return Object.assign(tag, {
    query,
    execute: query,
  }) as SqlClient
}

export const sql: SqlClient = isDatabaseConfigured ? createSqlClient() : missingDatabase()
