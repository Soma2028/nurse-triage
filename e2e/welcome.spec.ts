import { expect, test } from '@playwright/test'

// はじめて開いたときの状態（何も保存されていない）
test.use({ storageState: { cookies: [], origins: [] } })

test('初めて開くと、はじめの画面が出て、ゲストではじめられる', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'ようこそ' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ゲストではじめる' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'バックアップから読み込む' })).toBeVisible()

  await page.getByRole('button', { name: 'ゲストではじめる' }).tap()
  await expect(page.getByRole('heading', { level: 1, name: /\d+\/\d+/ })).toBeVisible()

  // 次に開いたときは、もう出さない
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /\d+\/\d+/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'ようこそ' })).toHaveCount(0)
})

test('招待リンクから初めて開いたときは、はじめの画面ではなく招待のページ', async ({ page }) => {
  await page.goto('/f/ABCD1234')
  await expect(page.getByRole('heading', { name: 'フレンドの招待' })).toBeVisible()
})
