import { DAY_MS, HOUR_MS } from '../constants'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const pad2 = (n: number) => String(n).padStart(2, '0')

/** 「11/24(火) 8:30」 */
export function formatDue(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]}) ${d.getHours()}:${pad2(d.getMinutes())}`
}

/** 締切までの残り：「あと45分」「あと14時間」「あと3日」、過ぎていれば「2時間超過」 */
export function formatRemaining(msLeft: number): string {
  const abs = Math.abs(msLeft)
  let s: string
  if (abs < HOUR_MS) s = `${Math.max(1, Math.floor(abs / 60000))}分`
  else if (abs < DAY_MS) s = `${Math.floor(abs / HOUR_MS)}時間`
  else s = `${Math.floor(abs / DAY_MS)}日`
  return msLeft < 0 ? `${s}超過` : `あと${s}`
}

/** 時間を「1.6h」「2h」の形に（小数1桁、末尾の .0 は省く） */
export function formatHours(h: number): string {
  const r = Math.round(h * 10) / 10
  return `${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)}h`
}

/** epoch ms → <input type="datetime-local"> の値 */
export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** <input type="datetime-local"> の値 → epoch ms（不正なら NaN） */
export function fromDatetimeLocal(v: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v)
  if (!m) return NaN
  const [, y, mo, d, h, mi] = m.map(Number)
  return new Date(y, mo - 1, d, h, mi).getTime()
}
