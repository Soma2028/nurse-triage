import { defineConfig, devices } from '@playwright/test'

/**
 * 画面の自動テスト（npm run e2e）。iPhone と同じ WebKit で、手元の開発サーバーを開いて確かめる。
 * 初めて動かす前に `npx playwright install webkit` で WebKit を入れておく
 */
const PORT = 5174

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['iPhone 15'],
    // devices の iPhone 15 は WebKit を使う
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
