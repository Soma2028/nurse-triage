import { createContext, useContext, type Dispatch } from 'react'
import type { Action, State } from './reducer'

export interface Store {
  state: State
  dispatch: Dispatch<Action>
  /** 画面表示用の現在時刻（定期的に更新） */
  now: number
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore は StoreProvider の中で使ってください')
  return s
}
