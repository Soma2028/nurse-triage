import { useEffect, useRef } from 'react'
import { useFriends } from '../social/friends'
import { useMyProfile } from '../social/useMyProfile'

/** アプリに戻ってきたとき、前に読んでからこれだけたっていれば読み直す */
const MIN_INTERVAL_MS = 60_000

/**
 * ホームのフレンドの様子のために、フレンドの一覧を裏で読む。何も描かない。
 * 起動したときと、アプリに戻ってきたとき（1分に1回まで）。Clerk を使うので SocialSync の中に置く
 */
export function FriendsRefresh() {
  const me = useMyProfile()
  const enabled = !!me.profile
  // useFriends は enabled になったときに1回読む
  const { load } = useFriends(enabled)
  // 最後に読んだ時刻（起動したときは useFriends が読むので、最初の戻りでは読み直さない）
  const last = useRef(0)

  useEffect(() => {
    if (!enabled) return
    last.current = Date.now()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last.current < MIN_INTERVAL_MS) return
      last.current = Date.now()
      void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [enabled, load])

  return null
}
