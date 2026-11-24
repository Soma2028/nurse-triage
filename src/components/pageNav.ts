import { useCallback, useState } from 'react'

/**
 * 一覧（top）と、そこから開くページの切り替え。せってい・ホーム・課題で共通。
 * dir は進むとき 1、戻るとき -1（PageStack のすべり込む向き）
 */
export function usePageNav<T>(top: T) {
  const [page, setPage] = useState<T>(top)
  const [dir, setDir] = useState(1)
  const go = useCallback((p: T) => {
    setDir(1)
    setPage(p)
  }, [])
  const back = useCallback(() => {
    setDir(-1)
    setPage(top)
  }, [top])
  return { page, dir, go, back, isTop: page === top }
}
