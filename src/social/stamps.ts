/**
 * 応援のスタンプ（api/_lib/socialDb.ts の STAMPS と同じ）。絵は lucide のアイコンで、絵文字は使わない。
 */
import { Award, Coffee, Flame, Handshake, type LucideIcon } from 'lucide-react'

export const STAMP_KEYS = ['ganbare', 'otsukare', 'issho', 'erai'] as const
export type Stamp = (typeof STAMP_KEYS)[number]

export const STAMPS: Record<Stamp, { label: string; Icon: LucideIcon }> = {
  ganbare: { label: 'がんばれ', Icon: Flame },
  otsukare: { label: 'おつかれ', Icon: Coffee },
  issho: { label: 'いっしょにやろう', Icon: Handshake },
  erai: { label: 'えらい', Icon: Award },
}

/** 同じ相手に1日に送れる数（サーバーと同じ） */
export const MAX_CHEERS_PER_DAY = 3

/** 「3分前」「21:03」「11/23」 */
export function cheerTime(at: number, now: number): string {
  const min = Math.floor((now - at) / 60_000)
  if (min < 1) return 'いま'
  if (min < 60) return `${min}分前`
  const d = new Date(at)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}
