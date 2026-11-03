import postgres from 'postgres'
import { limitInFlight } from './db-gate'
import { connectionOptions } from './db-options'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)')

const options = connectionOptions(url, process.env.DB_MAX)

// Next.js dev reloads modules; keep one client so reloads do not leak connections.
const globalForDb = globalThis as typeof globalThis & { __tiarraSql?: postgres.Sql }

// `prepare: false`, a small pool, TLS for hosted databases and a short idle timeout (see
// db-options.ts); limitInFlight() makes sure no more than `max` queries are ever in flight,
// because the Supabase pooler hangs on queries pipelined onto a busy connection.
export const sql: postgres.Sql =
  globalForDb.__tiarraSql ?? limitInFlight(postgres(url, options), options.max)

if (process.env.NODE_ENV !== 'production') globalForDb.__tiarraSql = sql
