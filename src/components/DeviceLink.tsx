import { useAuth } from '@clerk/react'
import { useEffect, useRef } from 'react'
import { authedCall } from '../social/api'
import { readDeviceLink, saveDeviceLink } from '../social/deviceLink'
import { usePushState } from '../sync/pushState'

/**
 * 通知をオンにしている端末に、ログインした人を付ける（応援を通知で届けるため）。何も描かない。
 * Clerk を使うので、App から必要なときだけ読み込む
 */
export function DeviceLink() {
  const { isSignedIn, userId, getToken } = useAuth()
  const { enabled, deviceId, secret } = usePushState()
  const tokenRef = useRef(getToken)
  useEffect(() => {
    tokenRef.current = getToken
  })

  useEffect(() => {
    if (!isSignedIn || !userId || !enabled || !deviceId || !secret) return
    const key = `${userId}:${deviceId}`
    if (readDeviceLink() === key) return
    let alive = true
    void authedCall(() => tokenRef.current(), 'POST', '/api/device', { deviceId, secret }).then(
      (r) => {
        // 付けられなければ、次に開いたときにまた付ける
        if (alive && r.ok) saveDeviceLink(key)
      },
    )
    return () => {
      alive = false
    }
  }, [isSignedIn, userId, enabled, deviceId, secret])

  return null
}
