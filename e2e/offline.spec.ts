import { expect, test } from '@playwright/test'

/** service worker が動き出して、このページを受け持つまで待つ */
async function waitForServiceWorker(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r))
    }
  })
}

test('一度開いたあとは、電波がなくてもアプリが開ける', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await waitForServiceWorker(page)
  // service worker が受け持ったページでもう一度開き、使うファイルを覚えさせる
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: '課題', exact: true }).last().tap()
  await expect(page.getByRole('heading', { level: 1, name: '課題' })).toBeVisible()
  await context.setOffline(false)
})

test('新しい版の確認（fetch("/")）は、覚えたものではなく電波で取る', async ({ page, context }) => {
  await page.goto('/')
  await waitForServiceWorker(page)
  await context.setOffline(true)
  // 覚えたもので答えてしまうと、新しい版に気づけなくなる
  const ok = await page.evaluate(async () => {
    try {
      await fetch('/', { cache: 'no-store' })
      return true
    } catch {
      return false
    }
  })
  expect(ok).toBe(false)
  await context.setOffline(false)
})
