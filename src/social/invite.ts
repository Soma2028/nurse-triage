/**
 * 招待リンク（/f/コード）。開いたときにコードを取り出し、アドレスは / に戻す（再読み込みで二度出ないように）。
 * Clerk を使わないので、ClerkProvider の外でも使える。
 */
import { useSyncExternalStore } from 'react'

const INVITE_PATH = /^\/f\/([A-Za-z0-9-]{4,16})\/?$/

/** 招待リンクのコードを、比べやすい形（ハイフンなし・大文字）にする */
export const normalizeCode = (s: string) => s.replace(/[\s-]/g, '').toUpperCase()

/** 自分の招待リンク */
export const inviteLink = (code: string) => `${location.origin}/f/${code}`

let pending: string | null = null
const listeners = new Set<() => void>()

/** 起動したときに1回だけ呼ぶ。招待リンクから開いていれば、そのコードを覚える */
export function takeInviteFromUrl(): void {
  const m = INVITE_PATH.exec(location.pathname)
  if (!m) return
  pending = normalizeCode(m[1])
  history.replaceState(null, '', '/')
}

export function clearInvite(): void {
  pending = null
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => pending

/** いま開いている招待のコード。なければ null */
export const usePendingInvite = () => useSyncExternalStore(subscribe, get, get)
