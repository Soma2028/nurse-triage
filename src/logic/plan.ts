import type { Analysed, Plan, PlanItem } from '../types'

const UNIT = 0.5

/** 0.5h 単位に丸める（最小 0.5h） */
export function roundHalf(h: number): number {
  return Math.max(UNIT, Math.round(h / UNIT) * UNIT)
}

/**
 * 今日の作業時間 H を、analyse() の並び順の上から割り振る。
 * 1件あたり min(remain, 残りH) を 0.5h 単位に丸める。合計は H を超えない。
 */
export function buildPlan(analysed: readonly Analysed[], hours: number): Plan {
  const H = Math.max(0, hours)
  // 0.5h 単位で割り振れる上限（H が 0.5 の倍数でなくても合計が H を超えないように）
  let left = Math.floor(H / UNIT) * UNIT
  const items: PlanItem[] = []

  for (const a of analysed) {
    if (left < UNIT) break
    if (a.remain <= 0) continue
    const h = Math.min(roundHalf(Math.min(a.remain, left)), left)
    items.push({ task: a.task, triage: a.triage, hours: h })
    left -= h
  }

  const used = items.reduce((s, i) => s + i.hours, 0)
  return { hours: H, items, used, free: H - used }
}
