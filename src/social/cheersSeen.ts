/**
 * 届いた応援を、どこまで見たか（いちばん新しく見た応援の時刻）。せっていの「フレンド」の行に、
 * まだ見ていない応援の数を出すために使う。端末ごとに localStorage に置く。
 */
import { useSyncExternalStore } from 'react'

const KEY = 'nurse-triage-cheers-seen'

function read(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

let seen = read()
const listeners = new Set<() => void>()

export function markCheersSeen(latest: number): void {
  if (latest <= seen) return
  seen = latest
  try {
    localStorage.setItem(KEY, String(latest))
  } catch {
    // 保存できなくても、この画面を開いている間は動く
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => seen

export const useCheersSeen = () => useSyncExternalStore(subscribe, get, get)
