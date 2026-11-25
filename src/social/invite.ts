/**
 * 招待リンク（/f/コード）。開いたときにコードを取り出し、アドレスは / に戻す（再読み込みで二度出ないように）。
 * Clerk を使わないので、ClerkProvider の外でも使える。
 */
import { useSyncExternalStore } from 'react'

const INVITE_PATH = /^\/f\/([A-Za-z0-9-]{4,16})\/?$/

/** 招待リンクのコードを、比べやすい形（ハイフンなし・大文字）にする */
export const normalizeCode = (s: string) => s.replace(/[\s-]/g, '').toUpperCase()

/**
 * 自分の招待リンク。LINE の中のブラウザで開くと、ログインのメールのやりとりがしにくいので、
 * openExternalBrowser=1 を付けて Safari などで開いてもらう（LINE だけが見る印。ほかでは何もしない）
 */
export const inviteLink = (code: string) => `${location.origin}/f/${code}?openExternalBrowser=1`

/** 貼り付けた文字（コードそのもの、または招待リンク）からフレンドのコードを取り出す。なければ null */
export function codeFromText(text: string): string | null {
  const t = text.trim()
  const fromLink = /\/f\/([A-Za-z0-9-]{4,16})/.exec(t)
  const raw = fromLink ? fromLink[1] : /^[A-Za-z0-9\s-]{4,20}$/.test(t) ? t : null
  if (!raw) return null
  const code = normalizeCode(raw)
  return code.length >= 4 && code.length <= 12 ? code : null
}

let pending: string | null = null
const listeners = new Set<() => void>()

/** アドレスが招待リンク（/f/コード）なら、そのコード。違えば null（アドレスはそのまま） */
export function inviteCodeInUrl(): string | null {
  const m = INVITE_PATH.exec(location.pathname)
  return m ? normalizeCode(m[1]) : null
}

/** 招待リンクのコードを覚えて、アドレスを / に戻す（アプリの中で招待のシートを出すとき） */
export function takeInviteFromUrl(): void {
  const code = inviteCodeInUrl()
  if (!code) return
  pending = code
  history.replaceState(null, '', '/')
  listeners.forEach((l) => l())
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
