import { useSyncExternalStore } from 'react'

/** メディアクエリに合っているか（画面サイズが変わると更新される） */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', onChange)
      return () => m.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** 背の低いスマホ（iPhone SE など）。ホームを1画面に収めるため、項目を減らす */
export const SHORT_SCREEN = '(max-width: 860px) and (max-height: 740px)'
