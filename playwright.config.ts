import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
const shouldStartWebServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL,
    storageState: process.env.E2E_STORAGE_STATE || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  webServer: shouldStartWebServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5174',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
