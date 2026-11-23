/**
 * せっていの「通知」の行の右に出す、いまの状態の一言。
 */
import { useEffect, useMemo, useState } from 'react'
import { usePushState } from './pushState'
import { currentEnv, detectSupport } from './support'

const readPermission = (): NotificationPermission =>
  'Notification' in window ? Notification.permission : 'default'

export function useNotifyStatus(): string {
  const { enabled } = usePushState()
  const support = useMemo(() => detectSupport(currentEnv()), [])
  const [permission, setPermission] = useState(readPermission)

  // 設定アプリで許可を変えて戻ってきたときに更新する
  useEffect(() => {
    const onVisible = () =>
      document.visibilityState === 'visible' && setPermission(readPermission())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (support === 'ios-browser') return 'ホーム画面に追加して使う'
  if (support === 'unsupported') return '使えない端末'
  if (permission === 'denied') return '許可されていない'
  return enabled ? 'オン' : 'オフ'
}
