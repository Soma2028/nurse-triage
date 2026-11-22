import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { StoreContext } from './context'
import { initState, reducer } from './reducer'
import { save } from './storage'

const TICK_MS = 30_000

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(Date.now()))
  const [now, setNow] = useState(() => Date.now())

  // 「あと○時間」や判定が古くならないよう、定期的と画面に戻ったときに時刻を更新
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, TICK_MS)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const { tasks, done, settings, schedule } = state
  useEffect(() => {
    save({ tasks, done, settings, schedule })
  }, [tasks, done, settings, schedule])

  const value = useMemo(() => ({ state, dispatch, now }), [state, now])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
