import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { defineConfig } from 'vitest/config'
import { testDatabaseUrl } from './tests/integration/test-db.ts'

// Vitest does not read .env.local on its own; the tests need the Supabase keys from it.
const localEnv = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}

// Tests never see the dev DATABASE_URL: the catalog tests truncate tables, so every project
// gets the throwaway `tiarra_test` database instead (built by tests/integration/global-setup.ts).
const env = { ...localEnv, DATABASE_URL: testDatabaseUrl(localEnv.DATABASE_URL ?? process.env.DATABASE_URL) }

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  // tsconfig keeps `jsx: preserve` for Next; vitest must compile JSX itself.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          env,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['./tests/integration/global-setup.ts'],
          // Several files truncate the same tables, so they must not overlap.
          fileParallelism: false,
          env,
        },
      },
    ],
  },
})
