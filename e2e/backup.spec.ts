import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('バックアップを書き出して、あとで読み込むと元に戻る', async ({ page }) => {
  // Playwright の WebKit は共有の画面を出さずに止まるので、ここでは共有を使わず保存にする
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'せってい', exact: true }).last().tap()
  await page.getByRole('button', { name: /バックアップ/ }).tap()
  await expect(page.getByRole('heading', { level: 1, name: 'バックアップ' })).toBeVisible()

  // 書き出す
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '書き出す' }).tap(),
  ])
  expect(download.suggestedFilename()).toMatch(/^kango-triage-\d{4}-\d{2}-\d{2}\.json$/)
  const path = await download.path()
  const text = await readFile(path, 'utf8')
  expect(JSON.parse(text)).toMatchObject({ app: 'nurse-triage', version: 1 })
  const count = (JSON.parse(text).data.tasks as unknown[]).length

  // そのあと課題を足す
  await page.getByRole('button', { name: 'ホーム', exact: true }).last().tap()
  await page.getByRole('button', { name: '課題を追加する' }).first().tap()
  await page.getByRole('dialog').getByLabel('課題名').fill('あとで足した課題')
  await page.getByRole('dialog').getByRole('button', { name: '追加する', exact: true }).tap()
  await expect(page.getByRole('dialog')).toBeHidden()

  // 読み込むと、書き出したときの課題に戻る
  await page.getByRole('button', { name: 'せってい', exact: true }).last().tap()
  await page.getByRole('button', { name: /バックアップ/ }).tap()
  await page.locator('input[type="file"]').setInputFiles(path)
  const sheet = page.getByRole('dialog', { name: 'バックアップを読み込む' })
  await expect(sheet.getByText(`${count}件`).first()).toBeVisible()
  await sheet.getByRole('button', { name: '置き換えて読み込む' }).tap()
  await expect(page.getByText('読み込んだよ。')).toBeVisible()
  const tasks = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nurse-triage-v1') ?? '{}').tasks as { title: string }[],
  )
  expect(tasks).toHaveLength(count)
  expect(tasks.some((t) => t.title === 'あとで足した課題')).toBe(false)
})

test('このアプリのものでないファイルは読み込まない', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'せってい', exact: true }).last().tap()
  await page.getByRole('button', { name: /バックアップ/ }).tap()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'other.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}'),
  })
  await expect(page.getByRole('alert')).toHaveText('このアプリのバックアップではないみたい。')
})
