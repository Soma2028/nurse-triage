/**
 * ホームに出す「フレンドの様子」の数だけを、フレンドの一覧の保存（localStorage）から読む。
 * Clerk を使わないので main の JS に入れてよい（friends.ts は Clerk を使うので入れない）。
 * 一覧が新しくなったら friends.ts が FRIENDS_EVENT を出し、ここが読み直す
 */
import { useSyncExternalStore } from 'react'

/** フレンドの一覧の保存場所（friends.ts と共通） */
export const FRIENDS_CACHE_KEY = 'nurse-triage-friends'
/** フレンドの一覧の保存が変わったときに window に出すイベント */
export const FRIENDS_EVENT = 'nurse-triage-friends-changed'

export interface FriendsSummary {
  /** フレンドの人数 */
  total: number
  /** 今日1つ以上完了にした人数 */
  active: number
}

/** 保存の中身から、today（YYYY-MM-DD）に完了した人数を数える。読めなければ null */
export function summarize(raw: string | null, today: string): FriendsSummary | null {
  try {
    const d = JSON.parse(raw ?? 'null') as {
      data?: { friends?: { progress?: { day?: unknown; doneCount?: unknown } | null }[] }
    } | null
    const friends = d?.data?.friends
    if (!Array.isArray(friends)) return null
    const active = friends.filter(
      (f) =>
        f?.progress?.day === today &&
        typeof f.progress.doneCount === 'number' &&
        f.progress.doneCount > 0,
    ).length
    return { total: friends.length, active }
  } catch {
    return null
  }
}

const read = () => {
  try {
    return localStorage.getItem(FRIENDS_CACHE_KEY)
  } catch {
    return null
  }
}

const subscribe = (l: () => void) => {
  window.addEventListener(FRIENDS_EVENT, l)
  // 別のタブで変わったとき
  window.addEventListener('storage', l)
  return () => {
    window.removeEventListener(FRIENDS_EVENT, l)
    window.removeEventListener('storage', l)
  }
}

/** フレンドの様子（フレンドがいない・ログインしていなければ null） */
export function useFriendsSummary(today: string): FriendsSummary | null {
  const raw = useSyncExternalStore(subscribe, read, () => null)
  const s = summarize(raw, today)
  return s && s.total > 0 ? s : null
}
