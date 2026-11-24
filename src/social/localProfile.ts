/**
 * ログインしていなくても使える、端末の中だけのプロフィール。フレンドには見えない。
 * ログインしたら、サーバーにプロフィールがなければこれを使って作り、あればサーバーの分で上書きする
 * （ログアウトしても、同じプロフィールが端末に残るように）。Clerk を使わないので、どこでも使える。
 */
import { useSyncExternalStore } from 'react'
import { PROFILE_ICONS, isPhoto, type ProfileInput } from './profile'

const KEY = 'nurse-triage-local-profile'

function isInput(v: unknown): v is ProfileInput {
  const p = v as Partial<ProfileInput> | null
  return (
    !!p &&
    typeof p.nickname === 'string' &&
    (PROFILE_ICONS as readonly unknown[]).includes(p.icon) &&
    (p.grade === null || typeof p.grade === 'number') &&
    typeof p.bio === 'string' &&
    (p.photo === undefined || p.photo === null || isPhoto(p.photo))
  )
}

function read(): ProfileInput | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown
    return isInput(v) ? v : null
  } catch {
    return null
  }
}

let current = read()
const listeners = new Set<() => void>()

export function getLocalProfile(): ProfileInput | null {
  return current
}

export function saveLocalProfile(p: ProfileInput | null): void {
  current = p
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p))
    else localStorage.removeItem(KEY)
  } catch {
    // 保存できなくても、この画面を開いている間は動く
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useLocalProfile = () =>
  useSyncExternalStore(subscribe, getLocalProfile, getLocalProfile)
