/**
 * 通知の端末に、ログインした人を付けたかどうかの記録と、ログアウトのときに外す処理。
 */
import { getPushState } from '../sync/pushState'
import { authedCall } from './api'

/** どの人をどの端末に付けたか（同じなら送り直さない） */
const KEY = 'nurse-triage-device-link'

export function readDeviceLink(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function saveDeviceLink(key: string): void {
  try {
    localStorage.setItem(KEY, key)
  } catch {
    // 保存できなくても、次に開いたときに付け直すだけ
  }
}

export function forgetDeviceLink(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 消せなくても、次に付けるときに付け直すだけ
  }
}

/** ログアウトの前に呼ぶ：この端末から、ログインしている人を外す（もう応援の通知が届かないように） */
export async function unlinkThisDevice(getToken: () => Promise<string | null>): Promise<void> {
  const { deviceId, secret } = getPushState()
  forgetDeviceLink()
  if (!deviceId || !secret) return
  await authedCall(getToken, 'DELETE', '/api/device', { deviceId, secret })
}
