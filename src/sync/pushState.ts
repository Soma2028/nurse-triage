/**
 * 通知まわりの状態（端末の名札・設定・最後に送れた内容）。課題とは別のキーで localStorage に置く。
 * 画面と同期の両方から読むので、小さな外部ストアにして useSyncExternalStore で購読する。
 */
import { useSyncExternalStore } from 'react'

export const PUSH_STORAGE_KEY = 'nurse-triage-push-v1'

export interface NotifyPrefs {
  eve: boolean // 前日 20:00
  h3: boolean // 3時間前
  morning: boolean // 朝 7:00 のまとめ
  showTitle: boolean // 通知に課題名を出す
}

export const DEFAULT_PREFS: NotifyPrefs = {
  eve: true,
  h3: true,
  morning: true,
  showTitle: false, // 課題名に患者さんの情報が入りやすいので、初期はオフ
}

/** サーバーから消しきれなかった端末（次に開いたときにもう一度消す） */
export interface PendingDelete {
  deviceId: string
  secret: string
  endpoint: string
}

export interface PushState {
  deviceId: string | null
  secret: string | null
  enabled: boolean // 通知を受け取る設定になっているか
  endpoint: string | null
  prefs: NotifyPrefs
  /** 最後にサーバーへ送れた内容（いまの内容と違えば送り直す） */
  synced: string | null
  pendingDelete: PendingDelete | null
  /** 端末側で通知の登録が消えていた（「もう一度オンにしてね」と出す） */
  lost: boolean
}

export const INITIAL_PUSH_STATE: PushState = {
  deviceId: null,
  secret: null,
  enabled: false,
  endpoint: null,
  prefs: DEFAULT_PREFS,
  synced: null,
  pendingDelete: null,
  lost: false,
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

/** 保存データを読む。ない・壊れているときは初期値 */
export function loadPushState(storage = defaultStorage()): PushState {
  try {
    const raw = storage?.getItem(PUSH_STORAGE_KEY)
    if (!raw) return INITIAL_PUSH_STATE
    const d = JSON.parse(raw) as Record<string, unknown>
    const p = (d.prefs ?? {}) as Record<string, unknown>
    const pd = d.pendingDelete as Record<string, unknown> | null | undefined
    const deviceId = str(d.deviceId)
    const secret = str(d.secret)
    return {
      deviceId,
      secret,
      // 名札がないのに「オン」は成り立たない
      enabled: bool(d.enabled, false) && !!deviceId && !!secret,
      endpoint: str(d.endpoint),
      prefs: {
        eve: bool(p.eve, DEFAULT_PREFS.eve),
        h3: bool(p.h3, DEFAULT_PREFS.h3),
        morning: bool(p.morning, DEFAULT_PREFS.morning),
        showTitle: bool(p.showTitle, DEFAULT_PREFS.showTitle),
      },
      synced: str(d.synced),
      pendingDelete:
        pd && str(pd.deviceId) && str(pd.secret) && str(pd.endpoint)
          ? {
              deviceId: pd.deviceId as string,
              secret: pd.secret as string,
              endpoint: pd.endpoint as string,
            }
          : null,
      lost: bool(d.lost, false),
    }
  } catch {
    return INITIAL_PUSH_STATE
  }
}

export function savePushState(state: PushState, storage = defaultStorage()): void {
  try {
    storage?.setItem(PUSH_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 保存できなくても、この画面を開いている間は動く
  }
}

/** 端末の名札を作る。secret は 32 バイトの乱数（URL セーフな base64 で43文字） */
export function newCredentials(): { deviceId: string; secret: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return { deviceId: crypto.randomUUID(), secret }
}

// ---- 外部ストア ----

let current: PushState = loadPushState()
const listeners = new Set<() => void>()

export function getPushState(): PushState {
  return current
}

export function setPushState(patch: Partial<PushState>): void {
  current = { ...current, ...patch }
  savePushState(current)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePushState(): PushState {
  return useSyncExternalStore(subscribe, getPushState, getPushState)
}
