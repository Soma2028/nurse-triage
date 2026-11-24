/**
 * iPhone で横にしてから縦に戻すと、ページ全体が少しずれたまま（または拡大されたまま）残ることがある。
 * アプリはページ全体をスクロールさせない作りなので、向き・大きさが変わったら、ずれを 0 に戻す。
 * iOS は回転のあと何度か大きさを変えてくるので、すぐ・少しあと・回転が落ち着いたあと、の3回直す
 */
function resetPageScroll() {
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function fixViewportOnRotate(): void {
  let timers: number[] = []
  const onChange = () => {
    timers.forEach((t) => window.clearTimeout(t))
    resetPageScroll()
    timers = [100, 400].map((ms) => window.setTimeout(resetPageScroll, ms))
  }
  window.addEventListener('orientationchange', onChange)
  window.addEventListener('resize', onChange)
  window.visualViewport?.addEventListener('resize', onChange)
}
