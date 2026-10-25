import { defineConfig, devices } from '@playwright/test'

// By default the suite builds nothing itself: it starts `next start` on the
// production build (run `npm run build` first). Set E2E_BASE_URL to test an
// already-running server, e.g. `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.
const external = process.env.E2E_BASE_URL
const PORT = 3210

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /(responsive|site-chrome|qr-webp)\.spec\.ts/ },
  ],
  webServer: external
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
