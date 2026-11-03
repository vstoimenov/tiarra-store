import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import type { TestProject } from 'vitest/node'
import { assertTestDatabase, TEST_DB_NAME } from './test-db'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../supabase/migrations', import.meta.url))

/** The server's maintenance database, the one DROP/CREATE DATABASE has to be issued from. */
function maintenanceUrl(testUrl: string): string {
  const url = new URL(testUrl)
  url.pathname = '/postgres'
  return url.toString()
}

/**
 * Rebuilds `tiarra_test` from supabase/migrations before the integration tests run: drop, create,
 * apply every migration in filename order. Starting from nothing each time means the database
 * always matches the migration files, with no state to track.
 */
export default async function setup(project: TestProject): Promise<void> {
  const testUrl = project.config.env?.DATABASE_URL
  assertTestDatabase(testUrl)

  const admin = postgres(maintenanceUrl(testUrl!), { max: 1, onnotice: () => {} })
  try {
    await admin.unsafe(`drop database if exists ${TEST_DB_NAME} with (force)`)
    await admin.unsafe(`create database ${TEST_DB_NAME}`)
  } finally {
    await admin.end()
  }

  const db = postgres(testUrl!, { max: 1, onnotice: () => {} })
  try {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      await db.unsafe(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    }
  } finally {
    await db.end()
  }
}
