import { expect, test, type Page } from '@playwright/test'

/** スマホの大きさ：iPhone SE・iPhone 15・いちばん狭い 360px */
const PHONES = [
  { name: 'SE', width: 375, height: 667 },
  { name: '15', width: 393, height: 852 },
  { name: '360', width: 360, height: 740 },
]
const TABS = ['ホーム', '課題', 'カレンダー', 'せってい'] as const

/** ページ全体が動かない（縦も横もスクロールしない）こと */
async function expectNoPageScroll(page: Page) {
  const [sh, sw, ih, iw] = await page.evaluate(() => [
    document.documentElement.scrollHeight,
    document.documentElement.scrollWidth,
    window.innerHeight,
    window.innerWidth,
  ])
  expect(sh, '縦にスクロールしない').toBe(ih)
  expect(sw, '横にスクロールしない').toBe(iw)
}

for (const phone of PHONES) {
  test(`どのタブもページ全体が動かない（${phone.name}）`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    for (const tab of TABS) {
      await page.getByRole('button', { name: tab, exact: true }).last().tap()
      await page.waitForTimeout(400)
      await expectNoPageScroll(page)
    }
  })
}

test('PC の幅では左にメニューが出て、横にスクロールしない', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('/')
  await expect(page.getByRole('button', { name: '課題を追加する' }).first()).toBeVisible()
  for (const tab of TABS) {
    await page.getByRole('button', { name: tab, exact: true }).first().click()
    await page.waitForTimeout(400)
    await expectNoPageScroll(page)
  }
  await page.close()
})
