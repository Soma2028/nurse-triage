/**
 * 自分のプロフィール。ログインしている人ごとに /api/profile から読み、localStorage にも置いておく
 * （次に開いたとき、読み込みを待たずにすぐ出すため）。ClerkProvider の中でだけ使う。
 */
import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { authedCall } from './api'
import { isProfile, type Profile, type ProfileInput } from './profile'

const CACHE_KEY = 'nurse-triage-profile'

type Status = 'loading' | 'ready' | 'error'

interface State {
  userId: string | null
  status: Status
  profile: Profile | null
}

function readCache(): State {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as {
      userId?: unknown
      profile?: unknown
    } | null
    if (d && typeof d.userId === 'string' && (d.profile === null || isProfile(d.profile))) {
      return { userId: d.userId, status: 'ready', profile: d.profile }
    }
  } catch {
    // 読めなければ、読み込み直す
  }
  return { userId: null, status: 'loading', profile: null }
}

let state: State = readCache()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    if (next.userId && next.status === 'ready') {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ userId: next.userId, profile: next.profile }),
      )
    } else if (!next.userId) {
      localStorage.removeItem(CACHE_KEY)
    }
  } catch {
    // 保存できなくても、この画面を開いている間は動く
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getState = () => state

export type SaveResult = 'ok' | 'invalid' | 'limited' | 'failed'

export function useMyProfile() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  // getToken が描くたびに変わっても、読み込みが何度も走らないよう ref に入れておく
  const tokenRef = useRef(getToken)
  useEffect(() => {
    tokenRef.current = getToken
  })
  const current = useSyncExternalStore(subscribe, getState, getState)

  const load = useCallback(async (id: string) => {
    // 前の人のプロフィールが見えないよう、人が変わったら読み込み中にする
    if (state.userId !== id) set({ userId: id, status: 'loading', profile: null })
    const r = await authedCall(() => tokenRef.current(), 'GET', '/api/profile')
    if (state.userId !== id) return // 読み込みの間にログアウトした
    if (r.ok && (r.data?.profile === null || isProfile(r.data?.profile))) {
      set({ userId: id, status: 'ready', profile: r.data.profile as Profile | null })
    } else if (state.status !== 'ready') {
      set({ ...state, status: 'error' })
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !userId) {
      if (state.userId) set({ userId: null, status: 'loading', profile: null })
      return
    }
    void load(userId)
  }, [isLoaded, isSignedIn, userId, load])

  const save = useCallback(
    async (input: ProfileInput): Promise<SaveResult> => {
      if (!userId) return 'failed'
      const r = await authedCall(() => tokenRef.current(), 'PUT', '/api/profile', input)
      if (r.ok && isProfile(r.data?.profile)) {
        set({ userId, status: 'ready', profile: r.data.profile })
        return 'ok'
      }
      return r.status === 400 ? 'invalid' : r.status === 429 ? 'limited' : 'failed'
    },
    [userId],
  )

  /** 今日の進み具合をフレンドに見せるか切り替える */
  const setShare = useCallback(
    async (share: boolean): Promise<boolean> => {
      if (!userId) return false
      const r = await authedCall(() => tokenRef.current(), 'PATCH', '/api/progress', { share })
      if (r.ok && isProfile(r.data?.profile)) {
        set({ userId, status: 'ready', profile: r.data.profile })
        return true
      }
      return false
    },
    [userId],
  )

  const mine = current.userId === userId && !!userId
  return {
    status: mine ? current.status : ('loading' as Status),
    profile: mine ? current.profile : null,
    /**
     * Clerk がログインを確かめている間だけ、前にログインしていた人のプロフィール（保存したもの）。
     * 確かめ終わるまで「ログインして…」の行を出して、あとで行がずれないようにするため。見た目にだけ使う
     */
    pending: !isLoaded && current.userId ? current.profile : null,
    reload: () => userId && load(userId),
    save,
    setShare,
  }
}
