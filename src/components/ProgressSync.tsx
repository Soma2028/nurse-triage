import { useAuth } from '@clerk/react'
import { useEffect, useRef } from 'react'
import { authedCall } from '../social/api'
import type { MyProgress } from '../social/progress'
import { useMyProfile } from '../social/useMyProfile'

/** 送るまで待つ時間（続けて課題を完了にしたときは、まとめて1回送る） */
const SYNC_DEBOUNCE_MS = 2000

/** 最後に送れた内容（だれの・どの数か）。同じなら送り直さない */
let lastSent: string | null = null

/**
 * 今日の進み具合（今日完了にした数・赤の数）を、変わったら /api/progress に送る。何も描かない。
 * ログインしていて、プロフィールがあり、「見せる」がオンのときだけ送る。Clerk を使うので App から必要なときだけ読み込む
 */
export function ProgressSync({ progress }: { progress: MyProgress }) {
  const { isSignedIn, userId, getToken } = useAuth()
  const me = useMyProfile()
  const tokenRef = useRef(getToken)
  useEffect(() => {
    tokenRef.current = getToken
  })

  const share = !!me.profile && me.profile.shareProgress !== false
  const snapshot = JSON.stringify(progress)

  useEffect(() => {
    if (!isSignedIn || !userId || !share) return
    const key = `${userId}:${snapshot}`
    if (lastSent === key) return
    const timer = window.setTimeout(async () => {
      const r = await authedCall(
        () => tokenRef.current(),
        'PUT',
        '/api/progress',
        JSON.parse(snapshot),
      )
      // 送れなかったら次に数が変わったときか、アプリを開いたときにまた送る
      if (r.ok) lastSent = key
    }, SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [isSignedIn, userId, share, snapshot])

  return null
}
