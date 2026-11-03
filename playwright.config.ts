import { defineConfig, devices } from '@playwright/test'

// `pnpm test:e2e` works on its own: it starts the dev server on 3100 unless one is already
// listening there (`reuseExistingServer`), so a running `pnpm dev` is reused, never duplicated.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  // A trace is only recorded on a retry, so retry in CI (where nobody can rerun by hand) and not locally.
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    // The first request compiles the page, so the server needs a while before it answers.
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
