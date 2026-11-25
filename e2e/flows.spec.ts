import { expect, test } from '@playwright/test'

test('右下の＋から課題を追加すると、課題の一覧に出る', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '課題を追加する' }).first().tap()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('課題名').fill('e2e の課題')
  await dialog.getByRole('button', { name: '追加する', exact: true }).tap()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: '課題', exact: true }).last().tap()
  // ホームから課題の画面に切り替わってから探す
  await expect(page.getByRole('heading', { level: 1, name: '課題' })).toBeVisible()
  await expect(page.getByRole('button', { name: /e2e の課題/ })).toBeVisible()
})

test('招待リンクを開くと、招待の専用ページが出る', async ({ page }) => {
  await page.goto('/f/abcd-1234?openExternalBrowser=1')
  await expect(page.getByRole('heading', { name: 'フレンドの招待' })).toBeVisible()
  await expect(page.getByText('ABCD1234')).toBeVisible()
  // 「このブラウザで申請する」で、アプリの上に招待のシートが出る
  await page.getByRole('button', { name: 'このブラウザで申請する' }).tap()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog', { name: 'フレンドの招待' })).toBeVisible()
})

test('せっていのヘルプが開ける', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'せってい', exact: true }).last().tap()
  await page.getByRole('button', { name: /ヘルプ/ }).tap()
  await expect(page.getByRole('heading', { level: 1, name: 'ヘルプ' })).toBeVisible()
  // データの扱い
  await page.getByRole('radio', { name: 'データ' }).tap()
  await expect(page.getByRole('heading', { name: 'サーバーに送るもの' })).toBeVisible()
})
