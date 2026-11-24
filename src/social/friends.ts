/**
 * フレンド（/api/friends）。一覧は localStorage にも置き、次に開いたときにすぐ出す。
 * ClerkProvider の中でだけ使う。
 */
import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { authedCall } from './api'
import { PROFILE_ICONS, type ProfileIcon } from './profile'

/** フレンドの一覧などに出す人（課題のことは何も含まない） */
export interface Person {
  userId: string
  nickname: string
  icon: ProfileIcon
  grade: number | null
  bio: string
}

export interface FriendState {
  friendCode: string
  friends: Person[]
  incoming: Person[] // 届いた申請
  outgoing: Person[] // 送った申請
  blocked: Person[] // ブロックした人
}

export type FriendAction =
  | { action: 'request'; code: string }
  | { action: 'accept' | 'decline' | 'cancel' | 'remove' | 'block' | 'unblock'; userId: string }
  | { action: 'regenerateCode' }

const isPerson = (v: unknown): v is Person => {
  const p = v as Partial<Person> | null
  return (
    !!p &&
    typeof p.userId === 'string' &&
    typeof p.nickname === 'string' &&
    (PROFILE_ICONS as readonly unknown[]).includes(p.icon) &&
    (p.grade === null || typeof p.grade === 'number') &&
    typeof p.bio === 'string'
  )
}

export function toFriendState(v: unknown): FriendState | null {
  const d = v as Record<string, unknown> | null
  if (!d || typeof d.friendCode !== 'string') return null
  const list = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]).filter(isPerson) : [])
  return {
    friendCode: d.friendCode,
    friends: list('friends'),
    incoming: list('incoming'),
    outgoing: list('outgoing'),
    blocked: list('blocked'),
  }
}

const CACHE_KEY = 'nurse-triage-friends'

interface Store {
  userId: string | null
  data: FriendState | null
  /** 最後の読み込みに失敗した理由（サーバーの error か、HTTP の番号）。うまくいったら null */
  error: string | null
}

function readCache(): Store {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Record<
      string,
      unknown
    > | null
    const data = toFriendState(d?.data)
    if (d && typeof d.userId === 'string' && data) return { userId: d.userId, data, error: null }
  } catch {
    // 読めなければ読み込み直す
  }
  return { userId: null, data: null, error: null }
}

let store: Store = readCache()
const listeners = new Set<() => void>()

function set(next: Store) {
  store = next
  try {
    if (next.userId && next.data)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: next.userId, data: next.data }))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // 保存できなくても動く
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getStore = () => store

/** 操作の結果。result はうまくいったとき、error はだめだったときの理由 */
export interface ActResult {
  result?: string
  error?: string
}

/**
 * フレンドの一覧。enabled（プロフィールがある）のときだけ読み込む
 */
export function useFriends(enabled: boolean) {
  const { isSignedIn, userId, getToken } = useAuth()
  // getToken が描くたびに変わっても、読み込みが何度も走らないよう ref に入れておく
  const tokenRef = useRef(getToken)
  useEffect(() => {
    tokenRef.current = getToken
  })

  const load = useCallback(async () => {
    if (!userId) return
    const r = await authedCall(() => tokenRef.current(), 'GET', '/api/friends')
    const data = toFriendState(r.data)
    if (r.ok && data) set({ userId, data, error: null })
    else {
      // 失敗しても前の一覧は残し、理由だけ覚えておく（「読み込んでいるよ」のまま止まらないように）
      const base = typeof r.data?.error === 'string' ? r.data.error : String(r.status)
      const reason = typeof r.data?.dbCode === 'string' ? `${base} ${r.data.dbCode}` : base
      console.error('フレンドを読み込めなかった', r.status, reason)
      set({ userId, data: store.userId === userId ? store.data : null, error: reason })
    }
  }, [userId])

  useEffect(() => {
    if (!isSignedIn || !userId) {
      if (store.userId) set({ userId: null, data: null, error: null })
      return
    }
    if (store.userId && store.userId !== userId) set({ userId: null, data: null, error: null })
    if (enabled) void load()
  }, [isSignedIn, userId, enabled, load])

  const act = useCallback(
    async (action: FriendAction): Promise<ActResult> => {
      if (!userId) return { error: 'network' }
      const r = await authedCall(() => tokenRef.current(), 'POST', '/api/friends', action)
      const data = toFriendState(r.data)
      if (r.ok && data) {
        set({ userId, data, error: null })
        return { result: String(r.data?.result ?? '') }
      }
      if (r.status === 400 && !r.data?.error) return { error: 'invalid input' }
      return { error: typeof r.data?.error === 'string' ? r.data.error : 'network' }
    },
    [userId],
  )

  const current = useSyncExternalStore(subscribe, getStore, getStore)
  const mine = current.userId === userId
  return {
    data: mine ? current.data : null,
    error: mine ? current.error : null,
    load,
    act,
  }
}
