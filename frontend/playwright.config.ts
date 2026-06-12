import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Spread instead of `workers: undefined` — exactOptionalPropertyTypes forbids
  // assigning undefined to an optional property; omitting it behaves identically.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: [['html'], ['stdout']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
});
