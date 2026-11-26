import { defineConfig, devices } from '@playwright/test'

/**
 * 画面の自動テスト（npm run e2e）。iPhone と同じ WebKit で、手元の開発サーバーを開いて確かめる。
 * 初めて動かす前に `npx playwright install webkit chromium` で WebKit と Chromium を入れておく
 */
const PORT = 5174

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // はじめの画面（アカウントを作る／ゲスト）は済ませた状態で始める。はじめの画面は e2e/welcome.spec.ts で確かめる
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [{ name: 'nurse-triage-welcomed', value: '1' }],
        },
      ],
    },
  },
  projects: [
    // 画面は iPhone と同じ WebKit で（devices の iPhone 15 は WebKit を使う）
    { name: 'iphone', use: { ...devices['iPhone 15'] }, testIgnore: /offline/ },
    // Playwright の WebKit は service worker を動かさないので、電波がないときのテストだけ Chromium で
    { name: 'offline', use: { ...devices['Pixel 7'] }, testMatch: /offline/ },
  ],
  // 公開版と同じ形（/assets/ のファイル・service worker）で確かめるため、ビルドしてから開く
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
