import { useEffect, useState } from 'react'

/** これより小さい差は、キーボードではなくブラウザのバーの出入りとみなす（px） */
const MIN_KEYBOARD = 80

/**
 * 画面の下でキーボードに隠れている高さ（px）。
 * 固定の要素は「レイアウトの画面」の下端に付くが、見えているのは visualViewport の範囲だけなので、
 * その差（レイアウトの高さ − 見えている下端）がキーボードの高さになる
 */
export function keyboardInset(
  layoutHeight: number,
  vv: { height: number; offsetTop: number },
): number {
  const hidden = layoutHeight - (vv.offsetTop + vv.height)
  return hidden >= MIN_KEYBOARD ? Math.round(hidden) : 0
}

/** キーボードの高さと、見えている高さ。キーボードが出ていなければ inset は 0 */
export function useKeyboardInset(enabled: boolean): { inset: number; visible: number } {
  const [state, setState] = useState({ inset: 0, visible: 0 })
  useEffect(() => {
    const vv = window.visualViewport
    if (!enabled || !vv) return
    const update = () =>
      setState({ inset: keyboardInset(window.innerHeight, vv), visible: Math.round(vv.height) })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setState({ inset: 0, visible: 0 })
    }
  }, [enabled])
  return state
}
