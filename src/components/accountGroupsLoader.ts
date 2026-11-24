import { lazy, type ComponentType } from 'react'

/**
 * せっていのプロフィール・アカウントの部分（AccountGroups。Clerk を使うので別のファイル）の読み込み。
 * 起動して落ち着いたら App が先に読み込んでおき、せっていを開いたときに待たずに出す
 */
type Mod = typeof import('./AccountGroups')

let loaded: Mod | null = null

export const loadAccountGroups = () =>
  import('./AccountGroups').then((m) => {
    loaded = m
    return m
  })

/**
 * AccountGroups の部品を lazy にする。読み込み済みならその場で返す
 * （React の lazy は、すぐ解決する then なら待たずに描く。待つと表示がまとめて 0.3 秒ほど遅れる）
 */
export function lazyAccountPart<P>(pick: (m: Mod) => ComponentType<P>) {
  return lazy(() => {
    const m = loaded
    if (m) {
      const done = { default: pick(m) }
      return { then: (resolve: (v: typeof done) => void) => resolve(done) } as Promise<typeof done>
    }
    return loadAccountGroups().then((mod) => ({ default: pick(mod) }))
  })
}
