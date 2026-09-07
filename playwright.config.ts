import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:3327', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node tests/browser/server.mjs', url: 'http://127.0.0.1:3327/api/health', reuseExistingServer: false, timeout: 15000 },
});
