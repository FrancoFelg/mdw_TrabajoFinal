import { defineConfig } from '@playwright/test';

// El lanzador valida y fija DATABASE_URL antes de iniciar aplicación y pruebas.
const database = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!database || database.protocol !== 'mysql:' || !['localhost', '127.0.0.1'].includes(database.hostname) || !/^mdw_e2e(?:_[a-z0-9_]+)?$/.test(database.pathname.slice(1))) {
  throw new Error('Ejecutá pnpm test:e2e; no uses la base de desarrollo.');
}
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: { channel: process.env.E2E_BROWSER_CHANNEL || 'chromium', baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
