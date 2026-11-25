/**
 * iPhone で横にしてから縦に戻すと、ページ全体が少しずれたまま（または拡大されたまま）残ることがある。
 * アプリはページ全体をスクロールさせない作りなので、向き・大きさが変わったら、ずれを 0 に戻す。
 * iOS は回転のあと何度か大きさを変えてくるので、すぐ・少しあと・回転が落ち着いたあと、の3回直す。
 *
 * ただし、文字を入力している間（キーボードが出ている間）は戻さない。
 * キーボードが出ると表示の大きさが変わるが、そこで戻すと、iPhone が入力欄を見える位置までずらすのを打ち消してしまい、
 * 入力欄がキーボードの裏に隠れる。キーボードを閉じたら、残ったずれを戻す
 */
function resetPageScroll() {
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/** いま文字を入力しているか（キーボードが出ているはずか） */
export function isEditing(el: Element | null = document.activeElement): boolean {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) {
    // 押すだけの入力欄（チェック・スライダー・日付の選ぶ画面など）はキーボードを出さない
    return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color'].includes(
      el.type,
    )
  }
  return el instanceof HTMLElement && el.isContentEditable
}

export function fixViewportOnRotate(): void {
  let timers: number[] = []
  const later = (fn: () => void) => {
    timers.forEach((t) => window.clearTimeout(t))
    fn()
    timers = [100, 400].map((ms) => window.setTimeout(fn, ms))
  }
  const onChange = () => {
    if (isEditing()) return
    later(resetPageScroll)
  }
  window.addEventListener('orientationchange', () => later(resetPageScroll))
  window.addEventListener('resize', onChange)
  window.visualViewport?.addEventListener('resize', onChange)
  // キーボードを閉じたあと（次の入力欄に移ったのでなければ）、ずれを戻す
  document.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!isEditing()) later(resetPageScroll)
    }, 0)
  })
}
